/**
 * ============================================================
 * Daily Attendance Seeder
 * ============================================================
 *
 * STEP 1 of the attendance workflow:
 *
 *   At the start of each day, every Active employee gets a
 *   default attendance record for today:
 *
 *     - If the employee has an Approved leave covering today
 *       → status = "On Leave"
 *     - Otherwise
 *       → status = "Present"
 *
 *   Nobody is ever marked "Absent" by default.
 *
 * HOW IT WORKS:
 *
 *   A single INSERT … SELECT … ON CONFLICT DO NOTHING query
 *   creates one row per active employee for the given date.
 *
 *   ON CONFLICT DO NOTHING means:
 *     • If the employee already has an attendance row for that
 *       date (e.g., from a manual check-in or a previous seed),
 *       the existing row is left untouched.
 *     • It is safe to call multiple times — idempotent.
 *
 * SCHEDULING:
 *
 *   • seedTodayAttendance() is called once on server startup
 *     to catch up in case the server was down at midnight.
 *   • A node-cron job fires at 00:01 every day to seed the
 *     new day's attendance automatically.
 *
 * ============================================================
 */

const pool = require('../config/db')
const cron = require('node-cron')

/**
 * Seed attendance for today for all Active employees.
 *
 * Employees with an Approved leave covering today get "On Leave".
 * Everyone else gets "Present".
 * Existing rows are never overwritten (ON CONFLICT DO NOTHING).
 */
const seedTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0]

    try {
        const result = await pool.query(
            `INSERT INTO attendance (employee_id, date, status)
             SELECT
                 e.id,
                 $1::date,
                 CASE
                     -- If the employee has an approved leave that covers today,
                     -- mark them as "On Leave" instead of "Present"
                     WHEN lr.employee_id IS NOT NULL THEN 'On Leave'
                     ELSE 'Present'
                 END
             FROM employees e
             LEFT JOIN (
                 -- Find all employees who have at least one approved leave
                 -- that spans the target date
                 SELECT DISTINCT employee_id
                 FROM leave_requests
                 WHERE status = 'Approved'
                   AND $1::date BETWEEN from_date AND to_date
             ) lr ON e.id = lr.employee_id
             WHERE e.status = 'Active'
             -- If a record already exists for this employee + date,
             -- do NOT overwrite it (preserves manual check-ins, prior imports, etc.)
             ON CONFLICT (employee_id, date) DO NOTHING`,
            [today]
        )

        console.log(`✅ Attendance seeded for ${today} — ${result.rowCount} new rows`)
    } catch (err) {
        console.error('❌ Attendance seed error:', err.message)
    }
}

/**
 * Schedule a cron job that seeds attendance at 00:01 every day.
 * The 1-minute offset gives a buffer past midnight to avoid
 * edge-case date flips.
 */
const startDailyCron = () => {
    cron.schedule('1 0 * * *', () => {
        console.log('⏰ Midnight cron: seeding daily attendance…')
        seedTodayAttendance()
    })

    console.log('📅 Daily attendance cron scheduled (00:01)')
}

module.exports = { seedTodayAttendance, startDailyCron }

const pool = require('../config/db')
const { seedTodayAttendance } = require('../utils/attendanceSeeder')

// GET /api/attendance?date=YYYY-MM-DD
// Returns all employees with final attendance display status.
// Status is read directly from the attendance table (single source of truth).
// The daily seeder + Excel import guarantee correct values there.
const getAttendanceByDate = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0]

        const result = await pool.query(
            `SELECT
                e.id AS employee_id,
                e.employee_id AS emp_code,
                e.first_name,
                e.last_name,
                e.email,
                d.department_name,
                COALESCE(a.status, 'Absent') AS status
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN attendance a 
                ON e.id = a.employee_id 
                AND a.date = $1
            ORDER BY e.first_name ASC`,
            [date]
        )

        res.json({ success: true, data: result.rows })
    } catch (err) {
        console.error("getAttendanceByDate Error:", err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// GET /api/attendance/stats?date=YYYY-MM-DD
// Returns attendance statistics for the given date.
// Reads directly from the attendance table — same source as all other APIs.
const getAttendanceStats = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0]

        const statsResult = await pool.query(
            `WITH daily_status AS (
                SELECT
                    e.id,
                    COALESCE(a.status, 'Absent') AS calculated_status
                FROM employees e
                LEFT JOIN attendance a 
                    ON e.id = a.employee_id 
                    AND a.date = $1
            )
            SELECT
                COUNT(*) FILTER (WHERE calculated_status = 'Present') AS present,
                COUNT(*) FILTER (WHERE calculated_status = 'Absent') AS absent,
                COUNT(*) FILTER (WHERE calculated_status = 'On Leave') AS on_leave,
                COUNT(*) AS total
            FROM daily_status`,
            [date]
        )

        const row = statsResult.rows[0]
        const present = parseInt(row.present, 10) || 0
        const absent = parseInt(row.absent, 10) || 0
        const onLeave = parseInt(row.on_leave, 10) || 0
        const totalEmployees = parseInt(row.total, 10) || 0

        res.json({
            success: true,
            data: {
                totalEmployees,
                present,
                absent,
                onLeave
            }
        })
    } catch (err) {
        console.error("getAttendanceStats Error:", err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// ── Shared helpers ──────────────────────────────────────────────
// Both the admin check-in/out routes and the working-hours calc need
// these, so they're pulled out instead of being duplicated per-function.

const getTodayStr = () => new Date().toISOString().split('T')[0]

const getNowTimeStr = () => new Date().toTimeString().split(' ')[0].substring(0, 5) // HH:MM

// Late tracking removed — every check-in is simply marked Present
const getCheckInStatus = () => 'Present'

// "HH:MM" + "HH:MM" -> "0Xh 0Ym"
const calculateWorkingHours = (checkInStr, checkOutStr) => {
    const [cH, cM] = checkInStr.split(':').map(Number)
    const [oH, oM] = checkOutStr.split(':').map(Number)
    const diffMinutes = (oH * 60 + oM) - (cH * 60 + cM)
    if (diffMinutes <= 0) return '-'
    const h = Math.floor(diffMinutes / 60)
    const m = diffMinutes % 60
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

// POST /api/attendance/checkin
// Body: { employeeId, location }
const checkIn = async (req, res) => {
    try {
        // Employee self check-in uses the JWT (req.user.employee_id).
        // Admin checking someone in on their behalf can still pass employeeId in the body.
        const employeeId = req.body.employeeId || req.user?.employee_id
        const { location } = req.body

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "employeeId is required" })
        }

        const today = getTodayStr()
        const checkInTime = getNowTimeStr()

        // Prevent multiple check-ins on the same day
        const existing = await pool.query(
            "SELECT check_in FROM attendance WHERE employee_id = $1 AND date = $2",
            [employeeId, today]
        )
        if (existing.rows.length > 0 && existing.rows[0].check_in) {
            return res.status(400).json({ success: false, message: "Already checked in today" })
        }

        const status = getCheckInStatus()

        const result = await pool.query(
            `INSERT INTO attendance (employee_id, date, check_in, status, location)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (employee_id, date) DO UPDATE
            SET check_in = $3, status = $4, location = COALESCE($5, attendance.location)
            RETURNING *`,
            [employeeId, today, checkInTime, status, location || null]
        )

        res.status(201).json({
            success: true,
            message: `Checked in as ${status}`,
            data: result.rows[0]
        })
    } catch (err) {
        console.error("checkIn Error:", err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/attendance/checkout
// Body: { employeeId }
const checkOut = async (req, res) => {
    try {
        // Employee self check-out uses the JWT (req.user.employee_id).
        // Admin checking someone out on their behalf can still pass employeeId in the body.
        const employeeId = req.body.employeeId || req.user?.employee_id

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "employeeId is required" })
        }

        const today = getTodayStr()
        const checkOutTime = getNowTimeStr()

        // Get existing record to validate check-in/out state and calculate working hours
        const existing = await pool.query(
            "SELECT check_in, check_out FROM attendance WHERE employee_id = $1 AND date = $2",
            [employeeId, today]
        )

        if (existing.rows.length === 0 || !existing.rows[0].check_in) {
            return res.status(404).json({ success: false, message: "No check-in record found for today" })
        }

        if (existing.rows[0].check_out) {
            return res.status(400).json({ success: false, message: "Already checked out today" })
        }

        const workingHours = calculateWorkingHours(existing.rows[0].check_in, checkOutTime)

        const result = await pool.query(
            `UPDATE attendance
            SET check_out = $1, working_hours = $2
            WHERE employee_id = $3 AND date = $4
            RETURNING *`,
            [checkOutTime, workingHours, employeeId, today]
        )

        res.json({
            success: true,
            message: "Checked out successfully",
            data: result.rows[0]
        })
    } catch (err) {
        console.error("checkOut Error:", err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/attendance/mark-leave
// Body: { employeeId, date }
const markLeave = async (req, res) => {
    try {
        const { employeeId, date } = req.body

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "employeeId is required" })
        }

        const leaveDate = date || getTodayStr()

        const result = await pool.query(
            `INSERT INTO attendance (employee_id, date, status)
            VALUES ($1, $2, 'On Leave')
            ON CONFLICT (employee_id, date) DO UPDATE
            SET status = 'On Leave', check_in = NULL, check_out = NULL, working_hours = NULL
            RETURNING *`,
            [employeeId, leaveDate]
        )

        res.status(201).json({
            success: true,
            message: "Marked as On Leave",
            data: result.rows[0]
        })
    } catch (err) {
        console.error("markLeave Error:", err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/attendance/mark-present
// Body: { employeeId, date }
const markPresent = async (req, res) => {
    try {
        const { employeeId, date } = req.body

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "employeeId is required" })
        }

        const attendanceDate = date || getTodayStr()

        const result = await pool.query(
            `INSERT INTO attendance (employee_id, date, status)
             VALUES ($1, $2, 'Present')
             ON CONFLICT (employee_id, date) DO UPDATE
             SET status = 'Present'
             RETURNING *`,
            [employeeId, attendanceDate]
        )

        res.status(201).json({
            success: true,
            message: "Employee marked as Present",
            data: result.rows[0]
        })
    } catch (err) {
        console.error("markPresent Error:", err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// POST /api/attendance/mark-absent
// Body: { employeeId, date }
const markAbsent = async (req, res) => {
    try {
        const { employeeId, date } = req.body

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'employeeId is required',
            })
        }

        const attendanceDate = date || getTodayStr()

        const result = await pool.query(
            `INSERT INTO attendance (employee_id, date, status)
             VALUES ($1, $2, 'Absent')
             ON CONFLICT (employee_id, date) DO UPDATE
             SET status = 'Absent',
                 check_in = NULL,
                 check_out = NULL,
                 working_hours = NULL
             RETURNING *`,
            [employeeId, attendanceDate]
        )

        res.status(201).json({
            success: true,
            message: 'Employee marked as Absent',
            data: result.rows[0],
        })
    } catch (err) {
        console.error('markAbsent Error:', err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// ── Employee-facing APIs ──────────────────────────────────────────
// These use req.user.employee_id from the JWT (set by the auth
// middleware) instead of trusting an employeeId in the request body —
// an employee should only ever be able to read their own attendance.

// GET /api/attendance/my-today
// Returns today's attendance record for the logged-in employee (or null if none yet)
const getMyTodayAttendance = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id

        if (!employeeId) {
            return res.status(401).json({ success: false, message: "Unauthorized — no employee context on token" })
        }

        const today = getTodayStr()

        const result = await pool.query(
            `SELECT
                a.id,
                a.employee_id,
                a.date,
                a.check_in,
                a.check_out,
                a.status,
                a.working_hours,
                a.location,
                a.remarks
            FROM attendance a
            WHERE a.employee_id = $1 AND a.date = $2`,
            [employeeId, today]
        )

        res.json({
            success: true,
            data: result.rows[0] || null
        })
    } catch (err) {
        console.error("getMyTodayAttendance Error:", err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// GET /api/attendance/my-records?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns attendance history for the logged-in employee, optionally
// bounded by a date range. Defaults to all records, newest first.
const getMyAttendanceRecords = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id

        if (!employeeId) {
            return res.status(401).json({ success: false, message: "Unauthorized — no employee context on token" })
        }

        const { startDate, endDate } = req.query

        const conditions = ["a.employee_id = $1"]
        const params = [employeeId]

        if (startDate) {
            params.push(startDate)
            conditions.push(`a.date >= $${params.length}`)
        }
        if (endDate) {
            params.push(endDate)
            conditions.push(`a.date <= $${params.length}`)
        }

        const result = await pool.query(
            `SELECT
                a.id,
                a.employee_id,
                a.date,
                a.check_in,
                a.check_out,
                a.status,
                a.working_hours,
                a.location,
                a.remarks
            FROM attendance a
            WHERE ${conditions.join(' AND ')}
            ORDER BY a.date DESC`,
            params
        )

        res.json({ success: true, data: result.rows })
    } catch (err) {
        console.error("getMyAttendanceRecords Error:", err)
        res.status(500).json({ success: false, message: err.message })
    }
}

// GET /api/attendance/dashboard/stats
// Returns today's attendance status, department, and working hours for the logged-in employee
const getEmployeeDashboardStats = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id
        if (!employeeId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const today = getTodayStr();

        // Status read directly from attendance table — same source as admin page.
        // No leave_requests re-derivation, so employee dashboard always matches admin.
        const result = await pool.query(
            `SELECT 
                e.first_name, e.last_name, 
                d.department_name,
                (SELECT COUNT(*) FROM employees e2 WHERE e2.department_id = e.department_id) as team_size,
                COALESCE(a.status, 'Absent') as today_status,
                a.check_in, a.check_out, a.working_hours
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $2
             WHERE e.id = $1`,
            [employeeId, today]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const row = result.rows[0];
        const fullName = `${row.first_name} ${row.last_name}`.trim();

        let workedPercent = 0;
        let workedHours = "00h 00m";
        if (row.working_hours) {
            workedHours = row.working_hours;
            const [h, m] = workedHours.split('h ');
            const mInt = parseInt(m);
            const hInt = parseInt(h);
            const totalMins = (hInt * 60) + (isNaN(mInt) ? 0 : mInt);
            // shift is 9 hours = 540 mins
            workedPercent = Math.min(100, Math.round((totalMins / 540) * 100));
        }

        // Format check_in AM/PM
        let formattedCheckIn = null;
        if (row.check_in) {
            const [h, m] = row.check_in.split(':');
            const hInt = parseInt(h);
            const ampm = hInt >= 12 ? 'PM' : 'AM';
            const h12 = hInt % 12 || 12;
            formattedCheckIn = `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
        }

        res.json({
            success: true,
            data: {
                employeeName: fullName,
                todayStatus: row.today_status,
                checkInTime: formattedCheckIn,
                department: row.department_name || "N/A",
                teamSize: parseInt(row.team_size) || 1,
                workedHours,
                shiftHours: "09h 00m",
                workedPercent
            }
        });
    } catch (err) {
        console.error("getEmployeeDashboardStats Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/attendance/week
// Returns last 10 days of attendance
const getAttendanceWeek = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Generate the last 10 days and left join with attendance.
        // Status read directly from attendance table — no leave_requests re-derivation.
        // "On Leave" in the attendance table is normalized to "on-leave" for the frontend.
        const result = await pool.query(
            `WITH days AS (
                SELECT generate_series(CURRENT_DATE - INTERVAL '9 days', CURRENT_DATE, '1 day'::interval)::date AS d
             )
             SELECT 
                TO_CHAR(d.d, 'Dy') AS day,
                EXTRACT(DAY FROM d.d)::int AS date,
                CASE 
                    WHEN EXTRACT(DOW FROM d.d) IN (0, 6) THEN 'weekend'
                    ELSE LOWER(COALESCE(a.status, 'present'))
                END AS status
             FROM days d
             LEFT JOIN attendance a ON d.d = a.date AND a.employee_id = $1
             ORDER BY d.d ASC`,
            [employeeId]
        );

        // Normalize: "on leave" (from LOWER) → "on-leave" for frontend CSS classes
        const data = result.rows.map(row => ({
            day: row.day,
            date: row.date,
            status: row.status === 'on leave' ? 'on-leave' : row.status
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error("getAttendanceWeek Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/attendance/month
// Returns attendance status for every day in a given month for the logged-in employee
const getMyAttendanceMonth = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ success: false, message: "month and year are required" });
        }

        // Status read directly from attendance table — no leave_requests re-derivation.
        // Calendar will show exactly what admin sees for every day.
        const result = await pool.query(
            `WITH days AS (
                SELECT generate_series(
                    MAKE_DATE($2::int, $1::int, 1),
                    (MAKE_DATE($2::int, $1::int, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date,
                    '1 day'::interval
                )::date AS d
             )
             SELECT 
                TO_CHAR(d.d, 'YYYY-MM-DD') AS date,
                EXTRACT(DOW FROM d.d)::int AS dow,
                CASE
                    WHEN EXTRACT(DOW FROM d.d) IN (0, 6) THEN 'weekend'
                    ELSE LOWER(COALESCE(a.status, 'present'))
                END AS status
             FROM days d
             LEFT JOIN attendance a ON d.d = a.date AND a.employee_id = $3
             ORDER BY d.d ASC`,
            [month, year, employeeId]
        );

        // Normalize: "on leave" (from LOWER) → "on-leave" for frontend CSS classes
        const data = result.rows.map((row) => ({
            date: row.date,
            status: row.status === 'on leave' ? 'on-leave' : row.status
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error("getMyAttendanceMonth Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/attendance/import
// Body: { records: [ { name, date, timing, status } ] }
//
// ============================================================
// STEP 2 of the attendance workflow — Excel Override
// ============================================================
//
// BEFORE this function runs, STEP 1 (the daily seeder) has
// already given every Active employee a default status of
// "Present" or "On Leave" for today.
//
// This function does three things:
//
//   1. Safety-net seed: calls seedTodayAttendance() to ensure
//      records exist for every date found in the Excel file
//      (idempotent — won't overwrite existing rows).
//
//   2. Process each Excel row: look up the employee by name,
//      mark them as Present, and collect their employee_id
//      grouped by date.
//
//   3. After all rows: for each date, find employees who are
//      NOT in the Excel and NOT on approved leave, and flip
//      them from "Present" → "Absent".
//
// Result:
//   • Excel-listed employees → Present
//   • Employees on leave → On Leave (preserved)
//   • Everyone else → Absent
// ============================================================
const importAttendance = async (req, res) => {
    try {
        const { records } = req.body

        if (!Array.isArray(records)) {
            return res.status(400).json({
                success: false,
                message: 'records array is required',
            })
        }

        // ── Collect distinct dates from the Excel data ──────────
        const dates = [
            ...new Set(records.map((r) => r.date || r.Date).filter(Boolean)),
        ]

        // ── Safety-net: ensure every active employee has a
        //    "Present" or "On Leave" row for each date in the
        //    Excel.  ON CONFLICT DO NOTHING means this is safe
        //    to call even if the midnight cron already ran. ───────
        await seedTodayAttendance()

        // ── Track which employee IDs were found in Excel,
        //    grouped by date, so we know who to mark Absent. ─────
        const excelEmployeesByDate = {}  // { 'YYYY-MM-DD': Set<employeeId> }
        for (const dateVal of dates) {
            excelEmployeesByDate[dateVal] = new Set()
        }

        let importedCount = 0
        const failedRecords = []

        // ── Process each Excel row ──────────────────────────────
        // This loop is identical to the original except:
        //   • We no longer pre-mark everyone as Absent
        //   • We collect matched employee IDs per date
        for (const record of records) {
            const empName =
                record.name ||
                record['Employee Name'] ||
                record['employee name']
            const dateVal = record.date || record.Date
            const statusVal =
                (record.status || record.Status || 'Present').toString().trim()

            if (!empName || !dateVal) {
                failedRecords.push({
                    ...record,
                    reason: 'Missing employee name or date',
                })
                continue
            }

            // Look up employee by full name (case-insensitive)
            const empRes = await pool.query(
                `SELECT id FROM employees
                 WHERE LOWER(TRIM(CONCAT(first_name, ' ', COALESCE(last_name, ''))))
                       = LOWER(TRIM($1))`,
                [empName]
            )

            if (empRes.rows.length === 0) {
                failedRecords.push({
                    ...record,
                    reason: 'Employee not found',
                })
                continue
            }

            const employeeId = empRes.rows[0].id
            const finalStatus =
                statusVal.toLowerCase() === 'absent' ? 'Absent' : 'Present'

            // Upsert: mark this employee's attendance for the date
            await pool.query(
                `INSERT INTO attendance (employee_id, date, status)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (employee_id, date) DO UPDATE
                 SET status = $3`,
                [employeeId, dateVal, finalStatus]
            )

            // Track this employee as "found in Excel" for this date
            if (excelEmployeesByDate[dateVal]) {
                excelEmployeesByDate[dateVal].add(employeeId)
            }

            importedCount++
        }

        // ── Update employees NOT found in Excel ─────────────────
        //
        // For each date, we handle two groups of employees who
        // were NOT listed in the Excel file:
        //
        //   1. Employees WITH an approved leave for this date
        //      → Ensure status = "On Leave" (never Absent)
        //
        //   2. Employees WITHOUT an approved leave for this date
        //      → Mark as "Absent"
        //
        // We check the leave_requests table directly (the
        // authoritative source) rather than relying on the
        // attendance row's current status column.
        for (const dateVal of dates) {
            const presentInExcel = Array.from(excelEmployeesByDate[dateVal])

            // ── Build the NOT-IN clause for Excel employee IDs ──
            // $1 is always the date. $2.. are employee IDs to exclude.
            const excelPlaceholders = presentInExcel
                .map((_, i) => `$${i + 2}`)
                .join(', ')

            // The NOT-IN condition: exclude employees found in Excel.
            // If Excel had zero matches for this date, we skip the
            // NOT IN clause entirely (affects ALL employees).
            const notInExcelCondition = presentInExcel.length > 0
                ? `AND a.employee_id NOT IN (${excelPlaceholders})`
                : ''

            const params = [dateVal, ...presentInExcel]

            // ── Phase 1: Employees with approved leave → "On Leave"
            //
            // If an employee has an approved leave covering this
            // date and was NOT in the Excel file, ensure their
            // attendance status is "On Leave".
            // (Handles edge case where seeder or prior import
            //  left them as "Present" but they're actually on leave.)
            await pool.query(
                `UPDATE attendance a
                 SET status = 'On Leave',
                     check_in = NULL,
                     check_out = NULL,
                     working_hours = NULL
                 WHERE a.date = $1
                   ${notInExcelCondition}
                   AND EXISTS (
                       SELECT 1 FROM leave_requests lr
                       WHERE lr.employee_id = a.employee_id
                         AND lr.status = 'Approved'
                         AND $1::date BETWEEN lr.from_date AND lr.to_date
                   )`,
                params
            )

            // ── Phase 2: Employees without approved leave → "Absent"
            //
            // Employees who were NOT in Excel AND do NOT have an
            // approved leave for this date are marked Absent.
            await pool.query(
                `UPDATE attendance a
                 SET status = 'Absent',
                     check_in = NULL,
                     check_out = NULL,
                     working_hours = NULL
                 WHERE a.date = $1
                   ${notInExcelCondition}
                   AND NOT EXISTS (
                       SELECT 1 FROM leave_requests lr
                       WHERE lr.employee_id = a.employee_id
                         AND lr.status = 'Approved'
                         AND $1::date BETWEEN lr.from_date AND lr.to_date
                   )`,
                params
            )
        }

        res.json({
            success: true,
            importedCount,
            failedRecords,
        })
    } catch (err) {
        console.error('importAttendance Error:', err)
        res.status(500).json({ success: false, message: err.message })
    }
}


module.exports = {
    getAttendanceByDate,
    getAttendanceStats,
    getMyTodayAttendance,
    getMyAttendanceRecords,
    getMyAttendanceMonth,
    checkIn,
    checkOut,
    markLeave,
    markPresent,
    markAbsent,
    getEmployeeDashboardStats,
    getAttendanceWeek,
    importAttendance
}

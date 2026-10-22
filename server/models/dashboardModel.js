const pool = require("../config/db");

// Stable color palette — assigned by index position, consistent across renders
const DEPT_COLORS = [
    "#4F46E5", // indigo
    "#10B981", // emerald
    "#F59E0B", // amber
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#94A3B8", // slate
    "#06B6D4", // cyan
    "#EF4444", // red
    "#84CC16", // lime
    "#F97316", // orange
];

// ===========================================
// Dashboard Statistics
// ===========================================
const getDashboardStats = async () => {
    const [
        totalEmployees,
        activeEmployees,
        totalDepartments,
        totalDesignations,
        onLeaveToday
    ] = await Promise.all([

        pool.query(`SELECT COUNT(*) AS total FROM employees`),

        pool.query(`SELECT COUNT(*) AS total FROM employees WHERE status = 'Active'`),

        pool.query(`SELECT COUNT(*) AS total FROM departments WHERE status = 'Active'`),

        pool.query(`SELECT COUNT(DISTINCT designation) AS total FROM employees WHERE designation IS NOT NULL AND designation <> ''`),

        // Count employees whose final attendance status for today is "On Leave".
        // Reading from the attendance table (single source of truth) ensures this
        // matches the attendance page stats — including cases where an Excel import
        // has overridden an approved-leave employee to Present.
        pool.query(`
            SELECT COUNT(*) AS total
            FROM attendance
            WHERE date = CURRENT_DATE
              AND status = 'On Leave'
        `)

    ]);

    return {
        totalEmployees:  Number(totalEmployees.rows[0].total),
        activeEmployees: Number(activeEmployees.rows[0].total),
        departments:     Number(totalDepartments.rows[0].total),
        designations:    Number(totalDesignations.rows[0].total),
        onLeave:         Number(onLeaveToday.rows[0].total),
    };
};

// ===========================================
// Overview — cumulative headcount per day
// for the current calendar month
// (uses hire_date to build a running total)
// ===========================================
const getOverview = async () => {
    const result = await pool.query(`
        WITH days AS (
            SELECT generate_series(
                date_trunc('month', CURRENT_DATE),
                CURRENT_DATE,
                INTERVAL '1 day'
            )::DATE AS day
        ),
        hires_per_day AS (
            SELECT hire_date::DATE AS day, COUNT(*) AS hired
            FROM employees
            WHERE hire_date IS NOT NULL
              AND hire_date >= date_trunc('month', CURRENT_DATE)
              AND hire_date <= CURRENT_DATE
            GROUP BY hire_date::DATE
        ),
        total_before_month AS (
            SELECT COUNT(*) AS base
            FROM employees
            WHERE hire_date IS NOT NULL
              AND hire_date < date_trunc('month', CURRENT_DATE)
        )
        SELECT
            TO_CHAR(d.day, 'Mon DD') AS date,
            (tbm.base + COALESCE(SUM(COALESCE(hpd.hired, 0)) OVER (ORDER BY d.day), 0))::INTEGER AS employees
        FROM days d
        CROSS JOIN total_before_month tbm
        LEFT JOIN hires_per_day hpd ON hpd.day = d.day
        ORDER BY d.day
    `);

    // Return one data point per 5 days to keep the chart readable
    return result.rows.filter((_, i) => i % 5 === 0 || i === result.rows.length - 1);
};

// ===========================================
// Department Distribution
// ===========================================
const getDepartmentDistribution = async () => {

    const result = await pool.query(`
        SELECT
            d.department_name AS name,
            COUNT(e.id)::INTEGER AS value
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id
        GROUP BY d.id, d.department_name
        ORDER BY value DESC
    `);

    return result.rows.map((row, i) => ({
        name:  row.name,
        value: row.value,
        color: DEPT_COLORS[i % DEPT_COLORS.length],
    }));
};

// ===========================================
// Recent Employees (last 5 by hire_date)
// ===========================================
const getRecentEmployees = async () => {

    const result = await pool.query(`
        SELECT
            e.employee_id,
            e.first_name || ' ' || e.last_name                     AS name,
            COALESCE(d.department_name, 'N/A')                     AS department,
            COALESCE(e.designation, 'N/A')                         AS designation,
            TO_CHAR(e.hire_date, 'Mon DD, YYYY')                   AS joined,
            COALESCE(e.status, 'Unknown')                          AS status
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY e.created_at DESC
        LIMIT 5
    `);

    return result.rows;
};

// ===========================================
// Upcoming Birthdays — next 30 days
// Uses date_of_birth if available in employees,
// falls back to dob in employee_personal_details
// ===========================================
const getBirthdays = async () => {

    // Try employees.date_of_birth first; fall back to personal details
    const result = await pool.query(`
        SELECT
            e.first_name || ' ' || e.last_name AS name,
            TO_CHAR(
                DATE(
                    DATE_PART('year', CURRENT_DATE)::TEXT || '-' ||
                    LPAD(DATE_PART('month', COALESCE(e.date_of_birth, epd.dob))::TEXT, 2, '0') || '-' ||
                    LPAD(DATE_PART('day',   COALESCE(e.date_of_birth, epd.dob))::TEXT, 2, '0')
                ),
                'Mon DD'
            ) AS date,
            -- Sort key: days from today (wrap around year-end)
            (
                DATE(
                    DATE_PART('year', CURRENT_DATE)::TEXT || '-' ||
                    LPAD(DATE_PART('month', COALESCE(e.date_of_birth, epd.dob))::TEXT, 2, '0') || '-' ||
                    LPAD(DATE_PART('day',   COALESCE(e.date_of_birth, epd.dob))::TEXT, 2, '0')
                ) - CURRENT_DATE
            ) AS days_until
        FROM employees e
        LEFT JOIN employee_personal_details epd ON epd.employee_id = e.id
        WHERE
            COALESCE(e.date_of_birth, epd.dob) IS NOT NULL
            AND (
                -- Birthday falls within the next 30 days this year
                (
                    DATE_PART('month', COALESCE(e.date_of_birth, epd.dob)) = DATE_PART('month', CURRENT_DATE)
                    AND DATE_PART('day', COALESCE(e.date_of_birth, epd.dob)) >= DATE_PART('day', CURRENT_DATE)
                ) OR (
                    DATE_PART('month', COALESCE(e.date_of_birth, epd.dob)) = DATE_PART('month', CURRENT_DATE + INTERVAL '30 days')
                    AND DATE_PART('day', COALESCE(e.date_of_birth, epd.dob)) <= DATE_PART('day', CURRENT_DATE + INTERVAL '30 days')
                ) OR (
                    DATE_PART('month', COALESCE(e.date_of_birth, epd.dob)) > DATE_PART('month', CURRENT_DATE)
                    AND DATE_PART('month', COALESCE(e.date_of_birth, epd.dob)) < DATE_PART('month', CURRENT_DATE + INTERVAL '30 days')
                )
            )
        ORDER BY days_until ASC
        LIMIT 10
    `);

    return result.rows.map(r => ({ name: r.name, date: r.date }));
};

// ===========================================
// Leave Summary — grouped by status
// ===========================================
const getLeaveSummary = async () => {

    const result = await pool.query(`
        SELECT
            COUNT(*)                                           AS total,
            COUNT(*) FILTER (WHERE status = 'Approved')       AS approved,
            COUNT(*) FILTER (WHERE status = 'Pending')        AS pending,
            COUNT(*) FILTER (WHERE status = 'Rejected')       AS rejected
        FROM leave_requests
    `);

    const row = result.rows[0];
    return {
        total:    Number(row.total),
        approved: Number(row.approved),
        pending:  Number(row.pending),
        rejected: Number(row.rejected),
    };
};

// ===========================================
// Legacy helpers (kept for /stats route)
// ===========================================
const getPendingLeaves = async () => {
    const result = await pool.query(`
        SELECT
            lr.id,
            e.employee_id,
            e.first_name,
            e.last_name,
            lr.leave_type,
            lr.from_date,
            lr.to_date,
            lr.total_days,
            lr.status
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        WHERE lr.status = 'Pending'
        ORDER BY lr.applied_on DESC
        LIMIT 5
    `);
    return result.rows;
};

const getMonthlyAttendance = async () => {
    const result = await pool.query(`
        SELECT
            TO_CHAR(date,'Mon') AS month,
            COUNT(*) FILTER (WHERE status = 'Present') AS present,
            COUNT(*) FILTER (WHERE status = 'Absent')  AS absent
        FROM attendance
        WHERE date >= CURRENT_DATE - INTERVAL '6 MONTH'
        GROUP BY DATE_TRUNC('month', date), TO_CHAR(date,'Mon')
        ORDER BY DATE_TRUNC('month', date)
    `);
    return result.rows;
};

module.exports = {
    getDashboardStats,
    getOverview,
    getDepartmentDistribution,
    getRecentEmployees,
    getBirthdays,
    getLeaveSummary,
    getPendingLeaves,
    getMonthlyAttendance,
};
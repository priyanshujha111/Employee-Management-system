const pool = require("../config/db");

// ============================================
// GET all profiles (no status filter by default — show ALL)
// ============================================
const getAllSubmittedProfiles = async (filters = {}) => {
    let query = `
        SELECT
            epd.employee_id,
            epd.first_name,
            epd.last_name,
            epd.email,
            epd.phone,
            epd.profile_completion,
            epd.verification_status,
            epd.updated_at,
            e.employee_id   AS emp_code,
            e.first_name    AS e_first,
            e.last_name     AS e_last,
            e.email         AS e_email,
            e.designation,
            e.hire_date,
            d.department_name
        FROM employee_personal_details epd
        JOIN employees e   ON epd.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE 1=1
    `;

    const values = [];
    let idx = 1;

    // Optional: status filter (only applied when explicitly passed and not "All")
    if (filters.status && filters.status !== "All" && filters.status !== "") {
        query += ` AND epd.verification_status = $${idx}`;
        values.push(filters.status);
        idx++;
    }

    // Optional: department filter
    if (filters.department && filters.department !== "All" && filters.department !== "") {
        query += ` AND d.department_name = $${idx}`;
        values.push(filters.department);
        idx++;
    }

    // Optional: search by name, employee_id string, or email
    if (filters.search && filters.search.trim() !== "") {
        const term = `%${filters.search.toLowerCase().trim()}%`;
        query += ` AND (
            LOWER(COALESCE(epd.first_name,''))  LIKE $${idx} OR
            LOWER(COALESCE(epd.last_name,''))   LIKE $${idx} OR
            LOWER(COALESCE(e.employee_id,''))   LIKE $${idx} OR
            LOWER(COALESCE(epd.email,''))       LIKE $${idx} OR
            LOWER(COALESCE(e.email,''))         LIKE $${idx}
        )`;
        values.push(term);
        idx++;
    }

    query += " ORDER BY epd.updated_at DESC";

    const result = await pool.query(query, values);
    return result.rows;
};

// ============================================
// GET complete profile (details + docs + logs)
// ============================================
const getCompleteProfile = async (employeeId) => {
    const detailsResult = await pool.query(
        `SELECT
             epd.*,
             e.employee_id AS emp_code,
             e.first_name  AS e_first,
             e.last_name   AS e_last,
             e.email       AS e_email,
             e.designation,
             e.hire_date,
             d.department_name
         FROM employee_personal_details epd
         JOIN employees e   ON epd.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE epd.employee_id = $1`,
        [employeeId]
    );

    const docsResult = await pool.query(
        "SELECT * FROM employee_documents WHERE employee_id = $1",
        [employeeId]
    );

    const logsResult = await pool.query(
        `SELECT pvl.*, u.username AS admin_name
         FROM personal_verification_logs pvl
         LEFT JOIN users u ON pvl.verified_by = u.id
         WHERE pvl.employee_id = $1
         ORDER BY pvl.created_at ASC`,
        [employeeId]
    );

    return {
        details:   detailsResult.rows[0] || null,
        documents: docsResult.rows[0] || null,
        logs:      logsResult.rows,
    };
};

// ============================================
// APPROVE profile
// ============================================
const approveProfile = async (employeeId, adminId, remarks) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE employee_personal_details
             SET verification_status = 'Verified', updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $1`,
            [employeeId]
        );

        await client.query(
            `INSERT INTO personal_verification_logs (employee_id, verified_by, status, remarks)
             VALUES ($1, $2, 'Verified', $3)`,
            [employeeId, adminId || null, remarks || "Profile approved"]
        );

        await client.query("COMMIT");
        return { status: "Verified" };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

// ============================================
// REJECT profile
// ============================================
const rejectProfile = async (employeeId, adminId, remarks) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE employee_personal_details
             SET verification_status = 'Rejected', updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $1`,
            [employeeId]
        );

        await client.query(
            `INSERT INTO personal_verification_logs (employee_id, verified_by, status, remarks)
             VALUES ($1, $2, 'Rejected', $3)`,
            [employeeId, adminId || null, remarks]
        );

        await client.query("COMMIT");
        return { status: "Rejected" };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

// ============================================
// REQUEST resubmission
// ============================================
const requestResubmission = async (employeeId, adminId, remarks) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE employee_personal_details
             SET verification_status = 'Pending Resubmission', updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $1`,
            [employeeId]
        );

        await client.query(
            `INSERT INTO personal_verification_logs (employee_id, verified_by, status, remarks)
             VALUES ($1, $2, 'Pending Resubmission', $3)`,
            [employeeId, adminId || null, remarks || "Resubmission requested"]
        );

        await client.query("COMMIT");
        return { status: "Pending Resubmission" };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

// ============================================
// GET verification logs
// ============================================
const getVerificationLogs = async (employeeId) => {
    const result = await pool.query(
        `SELECT pvl.*, u.username AS admin_name
         FROM personal_verification_logs pvl
         LEFT JOIN users u ON pvl.verified_by = u.id
         WHERE pvl.employee_id = $1
         ORDER BY pvl.created_at ASC`,
        [employeeId]
    );
    return result.rows;
};

module.exports = {
    getAllSubmittedProfiles,
    getCompleteProfile,
    approveProfile,
    rejectProfile,
    requestResubmission,
    getVerificationLogs,
};

const pool = require("../config/db");

// ===============================
// Employee - Apply Leave
// ===============================
const applyLeave = async (req, res) => {
    try {
        const {
            employee_id,
            leave_type,
            from_date,
            to_date,
            total_days,
            reason,
        } = req.body;

        const result = await pool.query(
            `INSERT INTO leave_requests
      (employee_id, leave_type, from_date, to_date, total_days, reason)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
            [
                employee_id,
                leave_type,
                from_date,
                to_date,
                total_days,
                reason,
            ]
        );

        res.status(201).json({
            success: true,
            message: "Leave Applied Successfully",
            data: result.rows[0],
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// ===============================
// Employee - My Leaves
// ===============================
const getMyLeaves = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const result = await pool.query(
            `SELECT *
       FROM leave_requests
       WHERE employee_id=$1
       ORDER BY applied_on DESC`,
            [employeeId]
        );

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// ===============================
// Admin - All Leave Requests
// ===============================
const getAllLeaves = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
      lr.*,
      e.employee_id,
      e.first_name,
      e.last_name,
      d.department_name
      FROM leave_requests lr
      JOIN employees e
      ON lr.employee_id = e.id
      LEFT JOIN departments d
      ON e.department_id = d.id
      ORDER BY lr.applied_on DESC
    `);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// ===============================
// Admin - Update Leave Status
// ===============================
const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const { status, reviewed_by } = req.body;

        const result = await pool.query(
            `UPDATE leave_requests
      SET status=$1,
      reviewed_by=$2,
      reviewed_at=NOW()
      WHERE id=$3
      RETURNING *`,
            [status, reviewed_by, id]
        );

        res.json({
            success: true,
            message: `Leave ${status}`,
            data: result.rows[0],
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// ===============================
// Employee - Leave Balance
// ===============================
const getLeaveBalance = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const leaveTypes = [
            { label: "Casual Leave", total: 15, color: "bg-emerald-500" },
            { label: "Sick Leave", total: 10, color: "bg-rose-500" },
            { label: "Earned Leave", total: 12, color: "bg-blue-500" },
            { label: "Comp Off", total: 5, color: "bg-violet-500" }
        ];

        // Sum approved leave days for this employee per type
        const result = await pool.query(
            `SELECT leave_type, SUM(total_days) as used
             FROM leave_requests
             WHERE employee_id = $1 AND status = 'Approved'
             GROUP BY leave_type`,
            [employeeId]
        );

        const usedMap = {};
        result.rows.forEach(row => {
            usedMap[row.leave_type] = parseInt(row.used);
        });

        const data = leaveTypes.map(lt => ({
            label: lt.label,
            total: lt.total,
            used: usedMap[lt.label] || 0,
            color: lt.color
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
    getLeaveBalance
};
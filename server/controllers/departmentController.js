const pool = require("../config/db");

// Get all departments
const getAllDepartments = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                d.id,
                d.department_name,
                d.description,
                d.head_name,
                d.head_email,
                d.status,
                d.created_at,
                COUNT(e.id) AS employee_count
            FROM departments d
            LEFT JOIN employees e
                ON d.id = e.department_id
            GROUP BY d.id
            ORDER BY d.id ASC
        `);

        res.status(200).json({
            success: true,
            data: result.rows,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Get department by ID
const getDepartmentById = async (req, res) => {
    try {

        const { id } = req.params;

        const result = await pool.query(
            "SELECT * FROM departments WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Add department
const addDepartment = async (req, res) => {

    try {

        const {
            department_name,
            description,
            head_name,
            head_email,
            status
        } = req.body;

        if (!department_name) {
            return res.status(400).json({
                success: false,
                message: "Department name is required",
            });
        }

        const departmentExists = await pool.query(
            "SELECT * FROM departments WHERE department_name = $1",
            [department_name]
        );

        if (departmentExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Department already exists",
            });
        }

        const result = await pool.query(
            `
            INSERT INTO departments
            (
                department_name,
                description,
                head_name,
                head_email,
                status
            )
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *
            `,
            [
                department_name,
                description,
                head_name,
                head_email,
                status || "Active",
            ]
        );

        res.status(201).json({
            success: true,
            message: "Department created successfully",
            data: result.rows[0],
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Update department
const updateDepartment = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            department_name,
            description,
            head_name,
            head_email,
            status,
        } = req.body;

        const result = await pool.query(
            `
            UPDATE departments
            SET
                department_name = $1,
                description = $2,
                head_name = $3,
                head_email = $4,
                status = $5
            WHERE id = $6
            RETURNING *
            `,
            [
                department_name,
                description,
                head_name,
                head_email,
                status,
                id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Department updated successfully",
            data: result.rows[0],
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Delete department
const deleteDepartment = async (req, res) => {

    try {

        const { id } = req.params;

        const exists = await pool.query(
            "SELECT * FROM departments WHERE id = $1",
            [id]
        );

        if (exists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        await pool.query(
            "DELETE FROM departments WHERE id = $1",
            [id]
        );

        res.status(200).json({
            success: true,
            message: "Department deleted successfully",
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

module.exports = {
    getAllDepartments,
    getDepartmentById,
    addDepartment,
    updateDepartment,
    deleteDepartment,
};
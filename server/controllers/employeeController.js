const pool = require('../config/db')
const bcrypt = require('bcrypt')

// Get all employees
const getAllEmployees = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                e.id,
                e.employee_id,
                e.first_name,
                e.last_name,
                e.email,
                e.phone,
                e.designation,
                e.status,
                e.hire_date,
                d.department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            ORDER BY e.id ASC
        `)

        res.json({
            success: true,
            data: result.rows
        })

    } catch (err) {
        console.error("Get All Employees Error:", err)

        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}


// Add new employee + create login account
const addEmployee = async (req, res) => {

    const {
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        gender,
        date_of_birth,
        hire_date,
        salary,
        designation,
        department_id,
        department_name,
        password
    } = req.body


    // Validate required fields
    if (!employee_id || !first_name || !email || !hire_date) {
        return res.status(400).json({
            success: false,
            message:
                "Required fields are missing. employee_id, first_name, email, and hire_date are required."
        })
    }


    const client = await pool.connect()

    try {

        // ==========================================
        // 1. Check duplicate employee ID
        // ==========================================

        const employeeIdCheck = await client.query(
            "SELECT id FROM employees WHERE employee_id = $1",
            [employee_id]
        )

        if (employeeIdCheck.rows.length > 0) {

            return res.status(400).json({
                success: false,
                message:
                    `Employee ID "${employee_id}" already exists. Please use a different one.`
            })
        }


        // ==========================================
        // 2. Check duplicate email
        // ==========================================

        const emailCheckEmployees = await client.query(
            "SELECT id FROM employees WHERE email = $1",
            [email]
        )

        const emailCheckUsers = await client.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        )


        if (
            emailCheckEmployees.rows.length > 0 ||
            emailCheckUsers.rows.length > 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `The email address "${email}" is already registered. Please use a unique email.`
            })
        }


        // ==========================================
        // 3. Start transaction
        // ==========================================

        await client.query('BEGIN')


        // ==========================================
        // 4. Resolve department ID
        // ==========================================

        let resolvedDepartmentId = department_id

        if (!resolvedDepartmentId && department_name) {

            const deptResult = await client.query(
                "SELECT id FROM departments WHERE department_name = $1",
                [department_name]
            )

            if (deptResult.rows.length > 0) {
                resolvedDepartmentId = deptResult.rows[0].id
            }
        }


        // ==========================================
        // 5. Prepare password
        // ==========================================

        const plainPassword = password || "Welcome@123"

        const hashedPassword = await bcrypt.hash(
            plainPassword,
            10
        )


        // ==========================================
        // 6. Insert employee
        // ==========================================

        const employeeResult = await client.query(
            `INSERT INTO employees
            (
                employee_id,
                first_name,
                last_name,
                email,
                phone,
                password,
                gender,
                date_of_birth,
                hire_date,
                salary,
                designation,
                department_id
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12
            )
            RETURNING *`,
            [
                employee_id,
                first_name,
                last_name || null,
                email,
                phone || null,
                hashedPassword,
                gender || null,
                date_of_birth || null,
                hire_date,
                salary ? Number(salary) : 0,
                designation || null,
                resolvedDepartmentId || null
            ]
        )


        const newEmployee = employeeResult.rows[0]


        // ==========================================
        // 7. Create login account in users table
        // ==========================================

        await client.query(
            `INSERT INTO users
            (
                employee_id,
                username,
                email,
                password,
                role
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5
            )`,
            [
                newEmployee.id,
                employee_id,
                email,
                hashedPassword,
                'employee'
            ]
        )


        // ==========================================
        // 8. Commit transaction
        // ==========================================

        await client.query('COMMIT')


        // ==========================================
        // 9. Send response
        // ==========================================

        res.status(201).json({
            success: true,
            message: "Employee created successfully",
            data: newEmployee
        })


    } catch (err) {

        // Rollback if anything fails
        await client.query('ROLLBACK')

        console.error(
            "Create Employee Error:",
            err
        )

        res.status(500).json({
            success: false,
            message: err.message
        })

    } finally {

        client.release()
    }
}


// Delete employee
const deleteEmployee = async (req, res) => {

    try {

        const { id } = req.params

        await pool.query(
            'DELETE FROM employees WHERE id = $1',
            [id]
        )

        res.json({
            success: true,
            message: 'Employee deleted'
        })

    } catch (err) {

        console.error(
            "Delete Employee Error:",
            err
        )

        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}


module.exports = {
    getAllEmployees,
    addEmployee,
    deleteEmployee
}
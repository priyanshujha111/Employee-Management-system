const pool = require("../config/db");

// GET /api/holidays
const getAllHolidays = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, holiday_name AS "holidayName", holiday_date AS "holidayDate", description, created_at AS "createdAt"
             FROM holidays
             ORDER BY holiday_date ASC`
        );
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching holidays:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// POST /api/holidays
const createHoliday = async (req, res) => {
    try {
        const { holidayName, holidayDate, description } = req.body;
        
        if (!holidayName || !holidayDate) {
            return res.status(400).json({ success: false, message: "holidayName and holidayDate are required" });
        }

        const result = await pool.query(
            `INSERT INTO holidays (holiday_name, holiday_date, description)
             VALUES ($1, $2, $3)
             RETURNING id, holiday_name AS "holidayName", holiday_date AS "holidayDate", description, created_at AS "createdAt"`,
            [holidayName, holidayDate, description || null]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Error creating holiday:", error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ success: false, message: "Holiday with this date already exists" });
        }
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// PUT /api/holidays/:id
const updateHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        const { holidayName, holidayDate, description } = req.body;
        
        if (!holidayName && !holidayDate && description === undefined) {
            return res.status(400).json({ success: false, message: "Provide at least one field to update" });
        }

        // Build dynamic update query
        let query = "UPDATE holidays SET ";
        const values = [];
        let count = 1;

        if (holidayName) {
            query += `holiday_name = $${count}, `;
            values.push(holidayName);
            count++;
        }
        if (holidayDate) {
            query += `holiday_date = $${count}, `;
            values.push(holidayDate);
            count++;
        }
        if (description !== undefined) {
            query += `description = $${count}, `;
            values.push(description);
            count++;
        }

        query = query.slice(0, -2); // Remove last comma
        query += ` WHERE id = $${count} RETURNING id, holiday_name AS "holidayName", holiday_date AS "holidayDate", description, created_at AS "createdAt"`;
        values.push(id);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Holiday not found" });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Error updating holiday:", error);
        if (error.code === '23505') { // Unique constraint violation
            return res.status(400).json({ success: false, message: "Holiday with this date already exists" });
        }
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// DELETE /api/holidays/:id
const deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM holidays WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Holiday not found" });
        }

        res.status(200).json({ success: true, message: "Holiday deleted successfully" });
    } catch (error) {
        console.error("Error deleting holiday:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    getAllHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
};

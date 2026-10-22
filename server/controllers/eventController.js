const pool = require("../config/db");

// GET /api/employee/events/upcoming
const getUpcomingEvents = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, date, tag, description
             FROM events
             WHERE date >= CURRENT_DATE
             ORDER BY date ASC
             LIMIT 5`
        );

        const data = result.rows.map(row => {
            const d = new Date(row.date);
            const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const day = String(d.getDate()).padStart(2, '0');
            const sub = d.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            return {
                id: String(row.id),
                month,
                day,
                title: row.title,
                sub,
                tag: row.tag || "Event",
                tagStyle: "bg-violet-50 text-violet-600"
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error("getUpcomingEvents Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET /api/employee/announcements/latest
const getLatestAnnouncement = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT title, body
             FROM announcements
             ORDER BY created_at DESC
             LIMIT 1`
        );

        if (result.rows.length === 0) {
            return res.json({ success: true, data: null });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("getLatestAnnouncement Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// GET /api/office-holidays?month=&year=&upcoming=4
const getOfficeHolidays = async (req, res) => {
    try {
        const { month, year, upcoming } = req.query;

        let currentMonthData = [];
        let upcomingData = [];

        if (month && year) {
            const currentRes = await pool.query(
                `SELECT date, month, year, title, day
                 FROM office_holidays
                 WHERE month = $1 AND year::TEXT = $2
                 ORDER BY date ASC`,
                [month, year]
            );
            currentMonthData = currentRes.rows;
        }

        const upc = parseInt(upcoming) || 4;

        const upcomingRes = await pool.query(
            `SELECT date, month, year, title, day
             FROM office_holidays
             WHERE MAKE_DATE(year, EXTRACT(MONTH FROM TO_DATE(month, 'Month'))::int, date) >= CURRENT_DATE
             ORDER BY MAKE_DATE(year, EXTRACT(MONTH FROM TO_DATE(month, 'Month'))::int, date) ASC
             LIMIT $1`,
            [upc]
        );
        upcomingData = upcomingRes.rows;

        res.json({
            success: true,
            data: {
                currentMonth: currentMonthData,
                upcoming: upcomingData
            }
        });
    } catch (err) {
        console.error("getOfficeHolidays Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = {
    getUpcomingEvents,
    getLatestAnnouncement,
    getOfficeHolidays
};

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const pool = require("./config/db");

// ===========================
// Routes
// ===========================
const employeeRoutes = require("./routes/employeeRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const authRoutes = require("./routes/authRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const personalRoutes = require("./routes/personalRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const testMailRoute = require("./routes/testmail");
const holidayRoutes = require("./routes/holiday.routes");

// ===========================
// Controllers for explicit routes
// ===========================
const { getEmployeeDashboardStats, getAttendanceWeek, getMyAttendanceMonth } = require("./controllers/attendanceController");
const { getLeaveBalance } = require("./controllers/leaveController");
const { getUpcomingEvents, getLatestAnnouncement, getOfficeHolidays } = require("./controllers/eventController");
const { verifyToken } = require("./middleware/authGuard");
const { seedTodayAttendance, startDailyCron } = require("./utils/attendanceSeeder");

const app = express();

/* ===========================
   Middleware
=========================== */

app.use(
    cors({
        origin: true, // LAN par kisi bhi device se access allow karega
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===========================
   Uploads Folder
=========================== */

const uploadsPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log("📁 uploads folder created");
}

app.use("/uploads", express.static(uploadsPath));

/* ===========================
   Health Check
=========================== */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Employee Management Backend Running 🚀",
    });
});

/* ===========================
   API Routes
=========================== */

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/personal-details", personalRoutes);
app.use("/api/admin/personal-verification", verificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api", testMailRoute);

/* ===========================
   Explicit New Routes
=========================== */
app.get("/api/employee/dashboard/stats", verifyToken, getEmployeeDashboardStats);
app.get("/api/employee/attendance/week", verifyToken, getAttendanceWeek);
app.get("/api/employee/attendance/month", verifyToken, getMyAttendanceMonth);
app.get("/api/employee/leave-balance", verifyToken, getLeaveBalance);
app.get("/api/employee/events/upcoming", verifyToken, getUpcomingEvents);
app.get("/api/employee/announcements/latest", verifyToken, getLatestAnnouncement);
app.get("/api/office-holidays", verifyToken, getOfficeHolidays);

/* ===========================
   Auto Migration
=========================== */

const runMigration = async () => {
    try {
        const schemaPath = path.join(
            __dirname,
            "config",
            "schema.sql"
        );

        if (fs.existsSync(schemaPath)) {
            const sql = fs.readFileSync(schemaPath, "utf8");
            await pool.query(sql);

            console.log("✅ Database migration completed");
        } else {
            console.log("⚠️ schema.sql not found");
        }
    } catch (err) {
        console.error("Migration Error:", err.message);
    }
};

/* ===========================
   404 Handler
=========================== */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

/* ===========================
   Start Server (LAN Mode)
=========================== */

const PORT = process.env.PORT || 5000;
const os = require("os");

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
};

const LAN_IP = getLocalIp();

const startServer = async () => {
    try {
        await runMigration();

        // STEP 1: Seed today's attendance on server start (catch-up for
        // restarts / cases where server was down at midnight)
        await seedTodayAttendance();
        // Schedule the midnight cron for future days
        startDailyCron();

        app.listen(PORT, "0.0.0.0", () => {
            console.log("==================================");
            console.log("🚀 Employee Management Server");
            console.log(`🌐 Local:   http://localhost:${PORT}`);
            console.log(`🌐 LAN:     http://${LAN_IP}:${PORT}`);
            console.log("==================================");
        });
    } catch (error) {
        console.error("Server Start Error:", error);
    }
};

startServer();
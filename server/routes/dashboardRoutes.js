const express = require("express");
const router = express.Router();

const {
    getAdminDashboard,
    getDashboardStats,
} = require("../controllers/dashboardController");

const {
    verifyToken,
    isAdmin,
} = require("../middleware/authGuard");

// ==========================================
// All Dashboard Routes Require Admin Login
// ==========================================
router.use(verifyToken, isAdmin);

// ==========================================
// GET Full Admin Dashboard
// GET /api/dashboard        (root alias — what the frontend calls)
// GET /api/dashboard/admin  (explicit — kept for backwards compat)
// ==========================================
router.get("/",      getAdminDashboard);
router.get("/admin", getAdminDashboard);

// ==========================================
// GET Dashboard Statistics Only
// GET /api/dashboard/stats
// ==========================================
router.get("/stats", getDashboardStats);

module.exports = router;
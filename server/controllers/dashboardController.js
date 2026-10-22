const dashboardModel = require("../models/dashboardModel");

// ===========================================
// ADMIN DASHBOARD
// GET /api/dashboard/admin   (full payload)
// GET /api/dashboard         (alias)
// ===========================================
const getAdminDashboard = async (req, res) => {
    try {

        const [
            stats,
            overview,
            departmentDistribution,
            recentEmployees,
            birthdays,
            leaveSummary,
        ] = await Promise.all([
            dashboardModel.getDashboardStats(),
            dashboardModel.getOverview(),
            dashboardModel.getDepartmentDistribution(),
            dashboardModel.getRecentEmployees(),
            dashboardModel.getBirthdays(),
            dashboardModel.getLeaveSummary(),
        ]);

        res.status(200).json({
            success: true,
            message: "Dashboard data fetched successfully",
            data: {
                stats,
                overview,
                departmentDistribution,
                recentEmployees,
                birthdays,
                leaveSummary,
            },
        });

    } catch (error) {

        console.error("Dashboard Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data",
            error: error.message,
        });

    }
};

// ===========================================
// DASHBOARD COUNTS ONLY
// GET /api/dashboard/stats
// ===========================================
const getDashboardStats = async (req, res) => {
    try {

        const stats = await dashboardModel.getDashboardStats();

        res.status(200).json({
            success: true,
            data: stats,
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
            error: error.message,
        });

    }
};

module.exports = {
    getAdminDashboard,
    getDashboardStats,
};
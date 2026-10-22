const verificationModel = require("../models/verificationModel");

// ============================================
// GET all submitted profiles
// ============================================
const getAllProfiles = async (req, res) => {
    try {
        const { status, department, search } = req.query;

        const profiles = await verificationModel.getAllSubmittedProfiles({
            status,
            department,
            search,
        });

        res.json({
            success: true,
            message: "Profiles fetched successfully",
            data: profiles,
        });
    } catch (error) {
        console.error("Get All Profiles Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching profiles",
        });
    }
};

// ============================================
// GET complete employee profile
// ============================================
const getProfile = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const profile = await verificationModel.getCompleteProfile(employeeId);

        if (!profile.details) {
            return res.status(404).json({
                success: false,
                message: "Employee profile not found",
            });
        }

        res.json({
            success: true,
            message: "Profile fetched successfully",
            data: profile,
        });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching profile",
        });
    }
};

// ============================================
// APPROVE profile
// ============================================
const approveProfile = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const adminId = req.user.id;
        const { remarks } = req.body;

        const result = await verificationModel.approveProfile(
            employeeId,
            adminId,
            remarks
        );

        res.json({
            success: true,
            message: "Profile verified successfully",
            data: result,
        });
    } catch (error) {
        console.error("Approve Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while approving profile",
        });
    }
};

// ============================================
// REJECT profile
// ============================================
const rejectProfile = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const adminId = req.user.id;
        const { remarks } = req.body;

        if (!remarks || !remarks.trim()) {
            return res.status(400).json({
                success: false,
                message: "Admin remarks are mandatory for rejection",
            });
        }

        const result = await verificationModel.rejectProfile(
            employeeId,
            adminId,
            remarks
        );

        res.json({
            success: true,
            message: "Profile rejected",
            data: result,
        });
    } catch (error) {
        console.error("Reject Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while rejecting profile",
        });
    }
};

// ============================================
// REQUEST resubmission
// ============================================
const requestResubmission = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const adminId = req.user.id;
        const { remarks } = req.body;

        const result = await verificationModel.requestResubmission(
            employeeId,
            adminId,
            remarks
        );

        res.json({
            success: true,
            message: "Resubmission requested successfully",
            data: result,
        });
    } catch (error) {
        console.error("Request Resubmission Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while requesting resubmission",
        });
    }
};

// ============================================
// GET verification logs
// ============================================
const getLogs = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const logs = await verificationModel.getVerificationLogs(employeeId);

        res.json({
            success: true,
            message: "Verification logs fetched successfully",
            data: logs,
        });
    } catch (error) {
        console.error("Get Logs Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching logs",
        });
    }
};

module.exports = {
    getAllProfiles,
    getProfile,
    approveProfile,
    rejectProfile,
    requestResubmission,
    getLogs,
};

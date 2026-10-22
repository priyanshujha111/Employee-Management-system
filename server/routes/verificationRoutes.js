const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authGuard");
const {
    getAllProfiles,
    getProfile,
    approveProfile,
    rejectProfile,
    requestResubmission,
    getLogs,
} = require("../controllers/verificationController");

// All routes require admin authentication
router.use(verifyToken, isAdmin);

// GET /api/admin/personal-verification — All profiles list
router.get("/", getAllProfiles);

// GET /api/admin/personal-verification/:employeeId/logs — History logs
// MUST be before /:employeeId to prevent "logs" being captured as employeeId
router.get("/:employeeId/logs", getLogs);

// GET /api/admin/personal-verification/:employeeId — Full profile
router.get("/:employeeId", getProfile);

// PUT /api/admin/personal-verification/:employeeId/approve
router.put("/:employeeId/approve", approveProfile);

// PUT /api/admin/personal-verification/:employeeId/reject
router.put("/:employeeId/reject", rejectProfile);

// PUT /api/admin/personal-verification/:employeeId/resubmit
router.put("/:employeeId/resubmit", requestResubmission);

module.exports = router;

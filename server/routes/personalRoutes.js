const express = require("express");
const router = express.Router();
const { verifyToken, isOwnerOrAdmin } = require("../middleware/authGuard");
const { documentUpload, handleMulterError } = require("../middleware/uploadMiddleware");
const {
    personalDetailsValidation,
    createDetails,
    updateDetails,
    getDetails,
    uploadDocuments,
    getDocuments,
    submitProfile,
} = require("../controllers/personalController");

// POST /api/personal-details — Create personal details
router.post("/", verifyToken, personalDetailsValidation, createDetails);

// ── Specific multi-segment routes MUST come before /:employeeId ──

// POST /api/personal-details/upload/:employeeId — Upload documents
router.post(
    "/upload/:employeeId",
    verifyToken,
    isOwnerOrAdmin,
    documentUpload,
    handleMulterError,
    uploadDocuments
);

// GET /api/personal-details/documents/:employeeId — Get uploaded documents
router.get("/documents/:employeeId", verifyToken, isOwnerOrAdmin, getDocuments);

// POST /api/personal-details/submit/:employeeId — Submit profile for verification
router.post("/submit/:employeeId", verifyToken, isOwnerOrAdmin, submitProfile);

// ── Generic single-segment routes come AFTER specific ones ──

// GET /api/personal-details/:employeeId — Fetch personal details
router.get("/:employeeId", verifyToken, isOwnerOrAdmin, getDetails);

// PUT /api/personal-details/:employeeId — Update personal details
router.put(
    "/:employeeId",
    verifyToken,
    isOwnerOrAdmin,
    personalDetailsValidation,
    updateDetails
);

module.exports = router;

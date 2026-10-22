const { validationResult, body } = require("express-validator");
const personalModel = require("../models/personalModel");

// ============================================
// Validation rules
// ============================================
const personalDetailsValidation = [
    body("phone")
        .optional()
        .matches(/^\d{10}$/)
        .withMessage("Phone must be exactly 10 digits"),
    body("email")
        .optional()
        .isEmail()
        .withMessage("Invalid email format"),
    body("aadhaar_number")
        .optional()
        .matches(/^\d{4}\s?\d{4}\s?\d{4}$/)
        .withMessage("Aadhaar must be 12 digits (format: 1234 5678 9012)"),
    body("pan_number")
        .optional()
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
        .withMessage("PAN must follow format ABCDE1234F"),
    body("ifsc_code")
        .optional()
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .withMessage("Invalid IFSC code format"),
    body("dob")
        .optional()
        .isDate()
        .withMessage("Invalid date of birth"),
    body("emergency_contact_number")
        .optional()
        .matches(/^\d{10}$/)
        .withMessage("Emergency contact number must be exactly 10 digits"),
];

// ============================================
// CREATE personal details
// ============================================
const createDetails = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                data: errors.array(),
            });
        }

        const employeeId = req.user.employee_id;

        // Check if already exists
        const existing = await personalModel.getPersonalDetails(employeeId);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Personal details already exist. Use PUT to update.",
            });
        }

        const result = await personalModel.createPersonalDetails(employeeId, req.body);

        res.status(201).json({
            success: true,
            message: "Personal details created successfully",
            data: result,
        });
    } catch (error) {
        console.error("Create Personal Details Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating personal details",
        });
    }
};

// ============================================
// UPDATE personal details
// ============================================
const updateDetails = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                data: errors.array(),
            });
        }

        const employeeId = parseInt(req.params.employeeId);

        // Check if exists, if not create
        const existing = await personalModel.getPersonalDetails(employeeId);
        let result;

        if (!existing) {
            result = await personalModel.createPersonalDetails(employeeId, req.body);
        } else {
            result = await personalModel.updatePersonalDetails(employeeId, req.body);
        }

        res.json({
            success: true,
            message: "Personal details updated successfully",
            data: result,
        });
    } catch (error) {
        console.error("Update Personal Details Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating personal details",
        });
    }
};

// ============================================
// GET personal details
// ============================================
const getDetails = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const result = await personalModel.getPersonalDetails(employeeId);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Personal details not found",
            });
        }

        res.json({
            success: true,
            message: "Personal details fetched successfully",
            data: result,
        });
    } catch (error) {
        console.error("Get Personal Details Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching personal details",
        });
    }
};

// ============================================
// UPLOAD documents
// ============================================
const uploadDocuments = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded",
            });
        }

        const result = await personalModel.upsertDocuments(employeeId, req.files);

        res.json({
            success: true,
            message: "Documents uploaded successfully",
            data: result,
        });
    } catch (error) {
        console.error("Upload Documents Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while uploading documents",
        });
    }
};

// ============================================
// GET documents
// ============================================
const getDocuments = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const result = await personalModel.getDocuments(employeeId);

        res.json({
            success: true,
            message: result ? "Documents fetched successfully" : "No documents found",
            data: result,
        });
    } catch (error) {
        console.error("Get Documents Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching documents",
        });
    }
};

// ============================================
// SUBMIT profile for verification
// ============================================
const submitProfile = async (req, res) => {
    try {
        const employeeId = parseInt(req.params.employeeId);

        const existing = await personalModel.getPersonalDetails(employeeId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Personal details not found. Please save details before submitting.",
            });
        }

        if (existing.verification_status === "Pending") {
            return res.status(400).json({
                success: false,
                message: "Profile is already submitted and pending verification.",
            });
        }

        if (existing.verification_status === "Verified") {
            return res.status(400).json({
                success: false,
                message: "Profile is already verified.",
            });
        }

        const result = await personalModel.submitForVerification(employeeId);

        res.json({
            success: true,
            message: "Profile submitted for verification successfully",
            data: result,
        });
    } catch (error) {
        console.error("Submit Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while submitting profile",
        });
    }
};

module.exports = {
    personalDetailsValidation,
    createDetails,
    updateDetails,
    getDetails,
    uploadDocuments,
    getDocuments,
    submitProfile,
};

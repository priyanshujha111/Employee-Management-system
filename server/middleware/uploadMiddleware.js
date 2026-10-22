const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const employeeId = req.params.employeeId || "unknown";
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${employeeId}_${file.fieldname}_${timestamp}${ext}`);
    },
});

// File filter — only allow jpg, jpeg, png, pdf
const fileFilter = (req, file, cb) => {
    const allowedTypes = [".jpg", ".jpeg", ".png", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(
            new Error("Invalid file type. Only JPG, JPEG, PNG and PDF are allowed."),
            false
        );
    }
};

// Multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
});

// Multi-field upload for documents
const documentUpload = upload.fields([
    { name: "passport_photo", maxCount: 1 },
    { name: "aadhaar_file", maxCount: 1 },
    { name: "pan_file", maxCount: 1 },
    { name: "address_proof", maxCount: 1 },
    { name: "qualification_certificate", maxCount: 1 },
    { name: "bank_passbook", maxCount: 1 },
    { name: "other_document", maxCount: 1 },
]);

// Error handler middleware for multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File size exceeds 5 MB limit.",
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    next();
};

module.exports = { documentUpload, handleMulterError };

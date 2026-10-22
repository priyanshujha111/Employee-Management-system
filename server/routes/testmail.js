const express = require("express");
const router = express.Router();

const sendEmail = require("../utils/sendEmail");

router.get("/send-test-mail", async (req, res) => {
    try {
        await sendEmail({
            email: "priyanshujha712003@gmail.com",
            subject: "Employee Management System Test",
            message: "Email working successfully 🚀",
        });

        res.json({
            success: true,
            message: "Mail sent",
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;
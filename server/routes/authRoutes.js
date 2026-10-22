const express = require("express");

const router = express.Router();

const {
    register,
    login,
    forgotPassword
} = require("../controllers/authController");


// =======================
// Register
// =======================
router.post("/register", register);


// =======================
// Login
// =======================
router.post("/login", login);


// =======================
// Forgot Password
// =======================
// Employee apna email dega.
// Server:
// 1. Employee ko database me find karega
// 2. New temporary password generate karega
// 3. Password ko bcrypt se hash karke DB me save karega
// 4. New password employee ke registered email par bhejega
router.post("/forgot-password", forgotPassword);


module.exports = router;
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// =======================
// Register
// =======================
const register = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            role,
            employee_id
        } = req.body;

        if (!username || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const checkUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (checkUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            `
            INSERT INTO users
            (employee_id, username, email, password, role)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING
                id,
                employee_id,
                username,
                email,
                role
            `,
            [
                employee_id || null,
                username,
                email,
                hashedPassword,
                role
            ]
        );

        res.status(201).json({
            success: true,
            message: "User Registered Successfully",
            user: newUser.rows[0]
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


// =======================
// Login
// =======================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid Email"
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid Password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                employee_id: user.employee_id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            message: "Login Successful",
            token,
            user: {
                id: user.id,
                employee_id: user.employee_id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};


// =======================
// Forgot Password
// =======================
// Generates a new temporary password,
// saves its bcrypt hash in the database,
// and sends the temporary password to
// the employee's registered email.
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Find user by registered email
        const result = await pool.query(
            `
            SELECT
                id,
                username,
                email,
                role
            FROM users
            WHERE email = $1
            `,
            [email]
        );

        /*
         * Do not reveal whether the email exists.
         */
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message:
                    "If this email exists, a new password has been sent to your email."
            });
        }

        const user = result.rows[0];

        // ==========================================
        // Generate temporary password
        // ==========================================
        const temporaryPassword = crypto
            .randomBytes(9)
            .toString("base64url")
            .slice(0, 12);

        // ==========================================
        // Hash temporary password using bcrypt
        // ==========================================
        const hashedPassword = await bcrypt.hash(
            temporaryPassword,
            10
        );

        // ==========================================
        // Update password in users table
        // ==========================================
        await pool.query(
            `
            UPDATE users
            SET password = $1
            WHERE id = $2
            `,
            [
                hashedPassword,
                user.id
            ]
        );

        // ==========================================
        // Gmail transporter
        // ==========================================
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // ==========================================
        // Send new password to employee
        // ==========================================
        await transporter.sendMail({
            from: `"Employee Management System" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Employee Management System - New Password",

            text: `
Hello ${user.username},

Your Employee Management System password has been reset.

Your new temporary password is:

${temporaryPassword}

You can use this password to login to the Employee Management System.

For security reasons, please change your password after logging in.

If you did not request this password reset, please contact your administrator.

Regards,
Employee Management System
            `,

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                ">
                    <h2>
                        Employee Management System
                    </h2>

                    <p>
                        Hello <strong>${user.username}</strong>,
                    </p>

                    <p>
                        Your Employee Management System password
                        has been reset successfully.
                    </p>

                    <p>
                        Your new temporary password is:
                    </p>

                    <div style="
                        padding: 14px 18px;
                        background: #f3f4f6;
                        border-radius: 6px;
                        font-size: 20px;
                        font-weight: bold;
                        letter-spacing: 1px;
                        display: inline-block;
                        margin: 10px 0;
                    ">
                        ${temporaryPassword}
                    </div>

                    <p>
                        Use this temporary password to login
                        to the Employee Management System.
                    </p>

                    <p>
                        For security reasons, please change your
                        password after logging in.
                    </p>

                    <p>
                        If you did not request this password reset,
                        please contact your administrator.
                    </p>

                    <p>
                        Regards,<br>
                        <strong>Employee Management System</strong>
                    </p>
                </div>
            `
        });

        return res.json({
            success: true,
            message:
                "A new temporary password has been sent to your email."
        });

    } catch (error) {
        console.error(
            "Forgot password error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to process password reset request"
        });
    }
};


// =======================
// Reset Password
// =======================
// Kept as existing functionality.
// This can still be used if you already have
// reset-token based password reset flow.
const resetPassword = async (req, res) => {
    try {
        const {
            token,
            password
        } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Token and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters"
            });
        }

        /*
         * Request me jo token aaya hai,
         * uska SHA-256 hash banate hain.
         */
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        /*
         * Check:
         * 1. Token match
         * 2. Token expired nahi hua
         * 3. Token pehle use nahi hua
         */
        const result = await pool.query(
            `
            SELECT
                id,
                user_id
            FROM password_reset_tokens
            WHERE token_hash = $1
              AND expires_at > CURRENT_TIMESTAMP
              AND used_at IS NULL
            `,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid or expired reset link"
            });
        }

        const resetRecord = result.rows[0];

        // New password ko bcrypt se hash karo
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // User password update
        await pool.query(
            `
            UPDATE users
            SET password = $1
            WHERE id = $2
            `,
            [
                hashedPassword,
                resetRecord.user_id
            ]
        );

        /*
         * Token ko used mark kar do.
         * Isse same reset link dobara use nahi ho sakta.
         */
        await pool.query(
            `
            UPDATE password_reset_tokens
            SET used_at = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [resetRecord.id]
        );

        return res.json({
            success: true,
            message:
                "Password reset successfully"
        });

    } catch (error) {
        console.error(
            "Reset password error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to reset password"
        });
    }
};


// =======================
// Export
// =======================
module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};
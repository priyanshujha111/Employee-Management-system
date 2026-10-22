const jwt = require("jsonwebtoken");

// ============================================
// Verify JWT Token
// ============================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. No token provided.",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, employee_id, role }
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
};

// ============================================
// Check Admin Role
// ============================================
const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required.",
        });
    }
    next();
};

// ============================================
// Check Owner or Admin
// Employee can access only their own data
// Admin can access everything
// ============================================
const isOwnerOrAdmin = (req, res, next) => {
    // Admin can access everything
    if (req.user.role === "admin") {
        return next();
    }

    const requestedEmployeeId = parseInt(req.params.employeeId, 10);
    const tokenEmployeeId = parseInt(req.user.employee_id, 10);

    // Use == (not ===) to safely compare even if one comes as string
    if (tokenEmployeeId !== requestedEmployeeId) {
        return res.status(403).json({
            success: false,
            message: "Access denied. You can only access your own profile.",
        });
    }

    next();
};

module.exports = { verifyToken, isAdmin, isOwnerOrAdmin };

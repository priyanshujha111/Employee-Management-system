const express = require("express");

const router = express.Router();

const {
    applyLeave,
    getMyLeaves,
    getAllLeaves,
    updateLeaveStatus,
} = require("../controllers/leaveController");

// Employee
router.post("/", applyLeave);

router.get("/my/:employeeId", getMyLeaves);

// Admin
router.get("/", getAllLeaves);

router.put("/:id", updateLeaveStatus);

module.exports = router;
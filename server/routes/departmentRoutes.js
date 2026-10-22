const express = require("express");

const {
    getAllDepartments,
    getDepartmentById,
    addDepartment,
    updateDepartment,
    deleteDepartment,
} = require("../controllers/departmentController");

const router = express.Router();

// Get all departments
router.get("/", getAllDepartments);

// Get single department by ID
router.get("/:id", getDepartmentById);

// Add new department
router.post("/", addDepartment);

// Update department
router.put("/:id", updateDepartment);

// Delete department
router.delete("/:id", deleteDepartment);

module.exports = router;
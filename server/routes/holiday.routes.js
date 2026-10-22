const express = require("express");
const router = express.Router();
const { verifyToken, isAdmin } = require("../middleware/authGuard");
const {
    getAllHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
} = require("../controllers/holiday.controller");

router.get("/", verifyToken, getAllHolidays);
router.post("/", verifyToken, isAdmin, createHoliday);
router.put("/:id", verifyToken, isAdmin, updateHoliday);
router.delete("/:id", verifyToken, isAdmin, deleteHoliday);

module.exports = router;

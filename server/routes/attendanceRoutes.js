const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/authGuard')
const {
    getAttendanceByDate,
    getAttendanceStats,
    getMyTodayAttendance,
    getMyAttendanceRecords,
    getMyAttendanceMonth,
    checkIn,
    checkOut,
    markLeave,
    markPresent,
    markAbsent,
    getEmployeeDashboardStats,
    getAttendanceWeek,
    importAttendance
} = require('../controllers/attendanceController')

// Get attendance records for a date
router.get('/', getAttendanceByDate)

// Get attendance stats for a date
router.get('/stats', getAttendanceStats)

// Get today's attendance for the logged-in employee
router.get('/my-today', verifyToken, getMyTodayAttendance)

// Get attendance history for the logged-in employee
router.get('/my-records', verifyToken, getMyAttendanceRecords)

// Get employee dashboard stats (today's status, department, working hours)
router.get('/dashboard/stats', verifyToken, getEmployeeDashboardStats)

// Get last 10 days of attendance for the logged-in employee
router.get('/week', verifyToken, getAttendanceWeek)

// Get attendance status for every day in a given month for the logged-in employee
router.get('/month', verifyToken, getMyAttendanceMonth)

// Check in an employee
router.post('/checkin', verifyToken, checkIn)

// Check out an employee
router.post('/checkout', verifyToken, checkOut)

// Mark employee as on leave
router.post('/mark-leave', markLeave)

// Mark employee as present
router.post('/mark-present', markPresent)

// Mark employee as absent
router.post('/mark-absent', markAbsent)

// Import attendance from Excel
router.post('/import', importAttendance)

module.exports = router
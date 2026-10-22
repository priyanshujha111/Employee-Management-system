const express = require('express')
const router = express.Router()
const { getAllEmployees, addEmployee, deleteEmployee } = require('../controllers/employeeController')

router.get('/', getAllEmployees)
router.post('/', addEmployee)
router.delete('/:id', deleteEmployee)

module.exports = router
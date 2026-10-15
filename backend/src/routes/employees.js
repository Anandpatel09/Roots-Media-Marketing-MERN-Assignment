const express = require('express');
const router = express.Router();
const {
  getEmployees,
  createEmployee,
  getEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const { employeeCreateRules, employeeUpdateRules } = require('../middleware/employeeValidators');
const { validate } = require('../middleware/validate');

router.get('/', getEmployees);
router.post('/', employeeCreateRules, validate, createEmployee);
router.get('/:id', getEmployee);
router.put('/:id', employeeUpdateRules, validate, updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;

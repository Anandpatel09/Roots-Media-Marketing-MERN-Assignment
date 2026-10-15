const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  getTask,
  updateTask,
  updateTaskStatus,
  exportTasksCSV,
} = require('../controllers/taskController');
const { taskCreateRules, taskUpdateRules, statusUpdateRules } = require('../middleware/taskValidators');
const { validate } = require('../middleware/validate');

// IMPORTANT: /export/csv must be defined BEFORE /:id to avoid "export" being treated as an ID
router.get('/export/csv', exportTasksCSV);

router.get('/', getTasks);
router.post('/', taskCreateRules, validate, createTask);
router.get('/:id', getTask);
router.put('/:id', taskUpdateRules, validate, updateTask);
router.put('/:id/status', statusUpdateRules, validate, updateTaskStatus);

module.exports = router;

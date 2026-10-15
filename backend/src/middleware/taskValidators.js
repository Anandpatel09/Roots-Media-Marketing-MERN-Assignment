const { body } = require('express-validator');

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const taskCreateRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),

  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),

  body('department')
    .optional({ nullable: true })
    .isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),

  body('priority')
    .notEmpty().withMessage('Priority is required')
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),

  body('dueDate')
    .notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Due date must be a valid date'),

  body('assignedEmployee')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId().withMessage('Invalid employee ID'),
];

const taskUpdateRules = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),

  body('description')
    .optional({ nullable: true })
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),

  body('department')
    .optional({ nullable: true })
    .isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid date'),

  body('assignedEmployee')
    .optional({ nullable: true })
    .custom((v) => v === null || v === '' || /^[a-f\d]{24}$/i.test(v))
    .withMessage('Invalid employee ID'),
];

const statusUpdateRules = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['Todo', 'In Progress', 'Completed', 'Cancelled'])
    .withMessage('Invalid status value'),
];

module.exports = { taskCreateRules, taskUpdateRules, statusUpdateRules };

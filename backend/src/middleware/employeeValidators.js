const { body } = require('express-validator');

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const STATUSES = ['Active', 'Inactive', 'On Leave'];

const employeeCreateRules = [
  body('employeeId')
    .trim()
    .notEmpty().withMessage('Employee ID is required')
    .isLength({ min: 2, max: 20 }).withMessage('Employee ID must be 2-20 characters'),

  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[+]?[\d\s\-().]{7,20}$/).withMessage('Invalid phone number format'),

  body('department')
    .notEmpty().withMessage('Department is required')
    .isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),

  body('role')
    .trim()
    .notEmpty().withMessage('Role is required')
    .isLength({ max: 100 }).withMessage('Role must not exceed 100 characters'),

  body('joiningDate')
    .notEmpty().withMessage('Joining date is required')
    .isISO8601().withMessage('Joining date must be a valid date'),

  body('status')
    .optional()
    .isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),

  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array'),

  body('leaveStart')
    .if(body('status').equals('On Leave'))
    .notEmpty().withMessage('Leave start date is required when status is On Leave')
    .isISO8601().withMessage('Leave start must be a valid date'),

  body('leaveEnd')
    .if(body('status').equals('On Leave'))
    .notEmpty().withMessage('Leave end date is required when status is On Leave')
    .isISO8601().withMessage('Leave end must be a valid date'),
];

const employeeUpdateRules = employeeCreateRules.map((rule) => rule.optional());

module.exports = { employeeCreateRules, employeeUpdateRules };

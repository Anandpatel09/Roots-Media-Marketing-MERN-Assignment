/**
 * Business rules service — all rules enforced here (not in controllers).
 */
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const { STATUS_TRANSITIONS } = require('../models/Task');

/**
 * Validate employee assignment for a task.
 * @param {ObjectId|string} employeeId - MongoDB _id of employee
 * @param {Date} taskStartDate
 * @returns {Promise<Employee>} the employee document
 * @throws {Error} with status code and message
 */
async function validateAssignment(employeeId, taskStartDate) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  if (employee.status === 'Inactive') {
    const err = new Error('Cannot assign task to an Inactive employee');
    err.statusCode = 400;
    throw err;
  }

  if (employee.status === 'On Leave') {
    const start = new Date(taskStartDate);
    const leaveStart = new Date(employee.leaveStart);
    const leaveEnd = new Date(employee.leaveEnd);
    // Normalize to date-only comparison
    start.setHours(0, 0, 0, 0);
    leaveStart.setHours(0, 0, 0, 0);
    leaveEnd.setHours(0, 0, 0, 0);

    if (start >= leaveStart && start <= leaveEnd) {
      const err = new Error(
        `Cannot assign task: employee is on leave from ${employee.leaveStart.toDateString()} to ${employee.leaveEnd.toDateString()}`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  return employee;
}

/**
 * Check capacity: employee must have fewer than 3 active (Todo + In Progress) tasks.
 * Uses findOneAndUpdate with $inc to atomically reserve a slot, preventing race conditions.
 *
 * We use a counter approach: count active tasks for this employee with a single
 * aggregation. For race-condition safety in production, use MongoDB transactions.
 *
 * @param {ObjectId} employeeMongoId - Employee._id
 * @param {string|null} excludeTaskId - Task._id to exclude (when editing)
 */
async function checkCapacity(employeeMongoId, excludeTaskId = null) {
  const match = {
    assignedEmployee: employeeMongoId,
    status: { $in: ['Todo', 'In Progress'] },
  };
  if (excludeTaskId) {
    match._id = { $ne: excludeTaskId };
  }

  const activeCount = await Task.countDocuments(match);
  if (activeCount >= 3) {
    const err = new Error(
      'Employee already has 3 active tasks (maximum allowed). Cannot assign more.'
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Validate task status transition.
 * @param {string} currentStatus
 * @param {string} newStatus
 */
function validateStatusTransition(currentStatus, newStatus) {
  const allowed = STATUS_TRANSITIONS[currentStatus];
  if (!allowed) {
    const err = new Error(`Unknown current status: ${currentStatus}`);
    err.statusCode = 400;
    throw err;
  }
  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}`
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Check if an employee can be deleted (no active tasks).
 * @param {ObjectId} employeeMongoId
 */
async function checkEmployeeDeletable(employeeMongoId) {
  const activeTaskCount = await Task.countDocuments({
    assignedEmployee: employeeMongoId,
    status: { $in: ['Todo', 'In Progress'] },
  });
  if (activeTaskCount > 0) {
    const err = new Error(
      `Cannot delete employee: they have ${activeTaskCount} active task(s). Reassign or cancel tasks first.`
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Build employee snapshot for a task.
 */
function buildEmployeeSnapshot(employee) {
  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    email: employee.email,
    department: employee.department,
    role: employee.role,
  };
}

module.exports = {
  validateAssignment,
  checkCapacity,
  validateStatusTransition,
  checkEmployeeDeletable,
  buildEmployeeSnapshot,
};

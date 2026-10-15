const Task = require('../models/Task');
const Employee = require('../models/Employee');

const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();

    const [
      totalEmployees,
      activeEmployees,
      totalTasks,
      tasksByStatus,
      overdueTasks,
      employeeWorkload,
    ] = await Promise.all([
      // Total employees
      Employee.countDocuments(),

      // Active employees
      Employee.countDocuments({ status: 'Active' }),

      // Total tasks
      Task.countDocuments(),

      // Tasks by status
      Task.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Overdue tasks (past dueDate, not Completed/Cancelled)
      Task.countDocuments({
        status: { $nin: ['Completed', 'Cancelled'] },
        dueDate: { $lt: now },
      }),

      // Employee workload: each employee with their active task count
      Task.aggregate([
        { $match: { status: { $in: ['Todo', 'In Progress'] }, assignedEmployee: { $ne: null } } },
        {
          $group: {
            _id: '$assignedEmployee',
            activeTaskCount: { $sum: 1 },
            tasksByStatus: { $push: '$status' },
          },
        },
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: '$employee' },
        {
          $project: {
            _id: 0,
            employeeId: '$employee.employeeId',
            fullName: '$employee.fullName',
            department: '$employee.department',
            role: '$employee.role',
            status: '$employee.status',
            activeTaskCount: 1,
            tasksByStatus: 1,
          },
        },
        { $sort: { activeTaskCount: -1 } },
        { $limit: 20 },
      ]),
    ]);

    // Format tasksByStatus into an object
    const statusCounts = {};
    tasksByStatus.forEach((t) => { statusCounts[t._id] = t.count; });

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        totalTasks,
        tasksByStatus: statusCounts,
        overdueTasks,
        employeeWorkload,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };

const mongoose = require('mongoose');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const {
  validateAssignment,
  checkCapacity,
  validateStatusTransition,
  buildEmployeeSnapshot,
} = require('../services/businessRules');
const { generateTasksCSV } = require('../services/csvService');

// ─── Build task filter from query ─────────────────────────────────────────────
function buildTaskFilter({ search, status, priority, department, dueDateFrom, dueDateTo }) {
  const filter = {};
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { 'employeeSnapshot.fullName': { $regex: search, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (department) filter.department = department;
  if (dueDateFrom || dueDateTo) {
    filter.dueDate = {};
    if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
    if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
  }
  return filter;
}

// Priority sort order (by importance)
const PRIORITY_ORDER = { Critical: 4, High: 3, Medium: 2, Low: 1 };

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
const getTasks = async (req, res, next) => {
  try {
    const {
      search = '',
      status,
      priority,
      department,
      dueDateFrom,
      dueDateTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = buildTaskFilter({ search, status, priority, department, dueDateFrom, dueDateTo });

    const sortOrder = order === 'asc' ? 1 : -1;
    let sortStage = {};

    if (sortBy === 'priority') {
      // Sort by priority importance using $addFields + $sort
    } else {
      const sortMap = {
        createdAt: { createdAt: sortOrder },
        dueDate: { dueDate: sortOrder },
        title: { title: sortOrder },
      };
      sortStage = sortMap[sortBy] || { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    let tasksQuery;
    let total;

    if (sortBy === 'priority') {
      // Use aggregation for priority sort
      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            priorityOrder: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', 'Critical'] }, then: 4 },
                  { case: { $eq: ['$priority', 'High'] }, then: 3 },
                  { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
                  { case: { $eq: ['$priority', 'Low'] }, then: 1 },
                ],
                default: 0,
              },
            },
            isOverdue: {
              $cond: {
                if: { $in: ['$status', ['Completed', 'Cancelled']] },
                then: false,
                else: { $gt: [new Date(), '$dueDate'] },
              },
            },
          },
        },
        { $sort: { priorityOrder: sortOrder, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
      ];
      const countPipeline = [{ $match: filter }, { $count: 'total' }];
      const [tasks, countResult] = await Promise.all([
        Task.aggregate(pipeline),
        Task.aggregate(countPipeline),
      ]);
      total = countResult[0]?.total || 0;

      return res.json({
        success: true,
        data: tasks,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      });
    }

    [tasksQuery, total] = await Promise.all([
      Task.find(filter)
        .sort(sortStage)
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: tasksQuery,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
const createTask = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { assignedEmployee: empId, startDate, dueDate, completedDate, ...taskData } = req.body;

    // Date validation
    if (new Date(dueDate) < new Date(startDate)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Due date cannot be before start date' });
    }

    let employeeMongoId = null;
    let snapshot = null;

    if (empId) {
      const employee = await validateAssignment(empId, startDate);
      await checkCapacity(employee._id);
      employeeMongoId = employee._id;
      snapshot = buildEmployeeSnapshot(employee);
    }

    const task = await Task.create(
      [
        {
          ...taskData,
          startDate,
          dueDate,
          assignedEmployee: employeeMongoId,
          employeeSnapshot: snapshot,
          status: 'Todo', // Always start as Todo
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({ success: true, data: task[0] });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedEmployee', 'employeeId fullName email department role status')
      .lean({ virtuals: true });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────────
const updateTask = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const task = await Task.findById(req.params.id).session(session);
    if (!task) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Terminal state check
    if (task.status === 'Completed' || task.status === 'Cancelled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot edit a ${task.status} task`,
      });
    }

    const { assignedEmployee: empId, startDate, dueDate, status, completedDate, ...updateData } = req.body;

    const newStartDate = startDate || task.startDate;
    const newDueDate = dueDate || task.dueDate;

    // Date validation
    if (new Date(newDueDate) < new Date(newStartDate)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Due date cannot be before start date' });
    }

    // Employee assignment change
    let employeeMongoId = task.assignedEmployee;
    let snapshot = task.employeeSnapshot;

    if (empId !== undefined) {
      if (empId === null || empId === '') {
        employeeMongoId = null;
        snapshot = null;
      } else {
        const employee = await validateAssignment(empId, newStartDate);
        const currentEmpId = task.assignedEmployee?.toString();
        const newEmpId = employee._id.toString();
        // Only check capacity if assigning to a different employee
        if (currentEmpId !== newEmpId) {
          await checkCapacity(employee._id, task._id);
        }
        employeeMongoId = employee._id;
        snapshot = buildEmployeeSnapshot(employee);
      }
    }

    Object.assign(task, updateData, {
      startDate: newStartDate,
      dueDate: newDueDate,
      assignedEmployee: employeeMongoId,
      employeeSnapshot: snapshot,
    });

    await task.save({ session });
    await session.commitTransaction();

    res.json({ success: true, data: task });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ─── PUT /api/tasks/:id/status ────────────────────────────────────────────────
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'New status is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Validate transition
    validateStatusTransition(task.status, status);

    task.status = status;

    // Set completedDate when transitioning to Completed
    if (status === 'Completed') {
      task.completedDate = new Date();
    }

    await task.save();
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/tasks/export/csv ────────────────────────────────────────────────
const exportTasksCSV = async (req, res, next) => {
  try {
    const { search = '', status, priority, department, dueDateFrom, dueDateTo } = req.query;
    const filter = buildTaskFilter({ search, status, priority, department, dueDateFrom, dueDateTo });

    // Fetch ALL matching tasks (not paginated)
    const tasks = await Task.find(filter).lean({ virtuals: true });

    const csv = generateTasksCSV(tasks);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tasks-export-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, updateTaskStatus, exportTasksCSV };

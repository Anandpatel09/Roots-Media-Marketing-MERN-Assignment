const Employee = require('../models/Employee');
const Task = require('../models/Task');
const { checkEmployeeDeletable } = require('../services/businessRules');

// ─── GET /api/employees ───────────────────────────────────────────────────────
const getEmployees = async (req, res, next) => {
  try {
    const {
      search = '',
      department,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {};

    // Search
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    // Filters
    if (department) query.department = department;
    if (status) query.status = status;

    // Sort
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortMap = {
      createdAt: { createdAt: sortOrder },
      fullName: { fullName: sortOrder },
      department: { department: sortOrder },
      joiningDate: { joiningDate: sortOrder },
    };
    const sort = sortMap[sortBy] || { createdAt: -1 };

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [employees, total] = await Promise.all([
      Employee.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Employee.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: employees,
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

// ─── POST /api/employees ──────────────────────────────────────────────────────
const createEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/employees/:id ───────────────────────────────────────────────────
const getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Also return their task count
    const taskCounts = await Task.aggregate([
      { $match: { assignedEmployee: employee._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = {};
    taskCounts.forEach((t) => { counts[t._id] = t.count; });

    res.json({ success: true, data: { ...employee, taskCounts: counts } });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/employees/:id ───────────────────────────────────────────────────
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Check if status is changing to Inactive/On Leave while they have active tasks
    const newStatus = req.body.status;
    if (newStatus && newStatus !== 'Active' && newStatus !== employee.status) {
      const activeCount = await Task.countDocuments({
        assignedEmployee: employee._id,
        status: { $in: ['Todo', 'In Progress'] },
      });
      if (activeCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status: employee has ${activeCount} active task(s). Reassign or cancel tasks first.`,
        });
      }
    }

    Object.assign(employee, req.body);
    await employee.save();

    res.json({ success: true, data: employee });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/employees/:id ────────────────────────────────────────────────
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Business rule: cannot delete while employee has active tasks
    await checkEmployeeDeletable(employee._id);

    // Nullify the reference in tasks, but snapshot is already preserved
    await Task.updateMany(
      { assignedEmployee: employee._id },
      { $set: { assignedEmployee: null } }
    );

    await employee.deleteOne();

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEmployees, createEmployee, getEmployee, updateEmployee, deleteEmployee };

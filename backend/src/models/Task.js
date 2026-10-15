const mongoose = require('mongoose');

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TASK_STATUSES = ['Todo', 'In Progress', 'Completed', 'Cancelled'];
const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];

// Valid status transitions
const STATUS_TRANSITIONS = {
  Todo: ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    // Snapshot preserved even if employee is deleted
    employeeSnapshot: {
      employeeId: String,
      fullName: String,
      email: String,
      department: String,
      role: String,
    },
    department: {
      type: String,
      enum: {
        values: DEPARTMENTS,
        message: `Department must be one of: ${DEPARTMENTS.join(', ')}`,
      },
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: PRIORITIES,
        message: `Priority must be one of: ${PRIORITIES.join(', ')}`,
      },
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: `Status must be one of: ${TASK_STATUSES.join(', ')}`,
      },
      default: 'Todo',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    completedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: isOverdue
taskSchema.virtual('isOverdue').get(function () {
  if (this.status === 'Completed' || this.status === 'Cancelled') return false;
  return new Date() > new Date(this.dueDate);
});

// Auto-generate taskId
taskSchema.pre('save', async function () {
  if (!this.taskId) {
    const count = await mongoose.model('Task').countDocuments();
    this.taskId = `TASK-${String(count + 1).padStart(4, '0')}`;
  }
});

// Indexes
taskSchema.index({ title: 'text' });
taskSchema.index({ status: 1, priority: 1, department: 1 });
taskSchema.index({ assignedEmployee: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.PRIORITIES = PRIORITIES;
module.exports.TASK_STATUSES = TASK_STATUSES;
module.exports.DEPARTMENTS = DEPARTMENTS;
module.exports.STATUS_TRANSITIONS = STATUS_TRANSITIONS;

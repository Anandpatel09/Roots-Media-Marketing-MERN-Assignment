const mongoose = require('mongoose');

const DEPARTMENTS = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const STATUSES = ['Active', 'Inactive', 'On Leave'];

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: {
        values: DEPARTMENTS,
        message: `Department must be one of: ${DEPARTMENTS.join(', ')}`,
      },
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      maxlength: [100, 'Role must not exceed 100 characters'],
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: `Status must be one of: ${STATUSES.join(', ')}`,
      },
      default: 'Active',
    },
    skills: {
      type: [String],
      default: [],
    },
    leaveStart: {
      type: Date,
      default: null,
    },
    leaveEnd: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Validate leave dates when status is On Leave
employeeSchema.pre('save', function () {
  if (this.status === 'On Leave') {
    if (!this.leaveStart || !this.leaveEnd) {
      throw new Error('Leave start and end dates are required when status is On Leave');
    }
    if (this.leaveEnd < this.leaveStart) {
      throw new Error('Leave end date cannot be before leave start date');
    }
  } else {
    this.leaveStart = null;
    this.leaveEnd = null;
  }
});

employeeSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  const status = update.status || (update.$set && update.$set.status);
  if (status && status !== 'On Leave') {
    if (!update.$set) update.$set = {};
    update.$set.leaveStart = null;
    update.$set.leaveEnd = null;
  }
});

// Index for search
employeeSchema.index({ fullName: 'text', email: 'text', employeeId: 'text' });
employeeSchema.index({ department: 1, status: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
module.exports.DEPARTMENTS = DEPARTMENTS;
module.exports.STATUSES = STATUSES;

const { Parser } = require('json2csv');

/**
 * Generate CSV content for tasks.
 * @param {Array} tasks - Array of task documents (with populated employeeSnapshot)
 * @returns {string} CSV string
 */
function generateTasksCSV(tasks) {
  const fields = [
    { label: 'Task ID', value: 'taskId' },
    { label: 'Title', value: 'title' },
    { label: 'Description', value: 'description' },
    { label: 'Department', value: 'department' },
    { label: 'Priority', value: 'priority' },
    { label: 'Status', value: 'status' },
    { label: 'Assigned Employee ID', value: (row) => row.employeeSnapshot?.employeeId || '' },
    { label: 'Assigned Employee Name', value: (row) => row.employeeSnapshot?.fullName || '' },
    { label: 'Assigned Employee Email', value: (row) => row.employeeSnapshot?.email || '' },
    { label: 'Start Date', value: (row) => row.startDate ? new Date(row.startDate).toLocaleDateString() : '' },
    { label: 'Due Date', value: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '' },
    { label: 'Completed Date', value: (row) => row.completedDate ? new Date(row.completedDate).toLocaleDateString() : '' },
    { label: 'Created Date', value: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '' },
    {
      label: 'Is Overdue',
      value: (row) => {
        if (row.status === 'Completed' || row.status === 'Cancelled') return 'No';
        return new Date() > new Date(row.dueDate) ? 'Yes' : 'No';
      },
    },
  ];

  const parser = new Parser({ fields });
  return parser.parse(tasks);
}

module.exports = { generateTasksCSV };

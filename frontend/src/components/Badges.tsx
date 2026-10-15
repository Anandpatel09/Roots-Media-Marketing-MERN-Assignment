import { priorityColors, taskStatusColors, employeeStatusColors } from '../utils/formatters';
import type { Priority, TaskStatus, EmployeeStatus } from '../types';
import { AlertTriangle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`badge ${priorityColors[priority]}`}>
      {priority}
    </span>
  );
}

interface TaskStatusBadgeProps {
  status: TaskStatus;
  isOverdue?: boolean;
}

export function TaskStatusBadge({ status, isOverdue }: TaskStatusBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`badge ${taskStatusColors[status]}`}>{status}</span>
      {isOverdue && (
        <span className="badge bg-rose-500/20 text-rose-400 border border-rose-500/30 gap-1">
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </span>
      )}
    </div>
  );
}

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus;
}

export function EmployeeStatusBadge({ status }: EmployeeStatusBadgeProps) {
  return (
    <span className={`badge ${employeeStatusColors[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'Active' ? 'bg-emerald-400' :
        status === 'On Leave' ? 'bg-amber-400' : 'bg-slate-400'
      }`} />
      {status}
    </span>
  );
}

// Department badge
const departmentColors: Record<string, string> = {
  Development: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  Design: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  QA: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  HR: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  Sales: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
};

interface DepartmentBadgeProps {
  department: string;
}

export function DepartmentBadge({ department }: DepartmentBadgeProps) {
  return (
    <span className={`badge ${departmentColors[department] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
      {department}
    </span>
  );
}

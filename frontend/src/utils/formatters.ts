import type { Priority, TaskStatus, EmployeeStatus } from '../types';

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toInputDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

export function isOverdue(dueDate: string, status: TaskStatus): boolean {
  if (status === 'Completed' || status === 'Cancelled') return false;
  return new Date() > new Date(dueDate);
}

export const priorityColors: Record<Priority, string> = {
  Low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  Medium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  High: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  Critical: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
};

export const taskStatusColors: Record<TaskStatus, string> = {
  'Todo': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  'In Progress': 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  'Completed': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'Cancelled': 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
};

export const employeeStatusColors: Record<EmployeeStatus, string> = {
  'Active': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'Inactive': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  'On Leave': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
};

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as { message: string }).message;
  }
  return 'An unexpected error occurred';
}

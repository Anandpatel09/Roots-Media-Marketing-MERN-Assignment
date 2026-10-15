// ─── Shared Enums ─────────────────────────────────────────────────────────────
export type Department = 'Development' | 'Design' | 'QA' | 'HR' | 'Sales';
export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Todo' | 'In Progress' | 'Completed' | 'Cancelled';

export const DEPARTMENTS: Department[] = ['Development', 'Design', 'QA', 'HR', 'Sales'];
export const EMPLOYEE_STATUSES: EmployeeStatus[] = ['Active', 'Inactive', 'On Leave'];
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
export const TASK_STATUSES: TaskStatus[] = ['Todo', 'In Progress', 'Completed', 'Cancelled'];

export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'Todo': ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  'Completed': [],
  'Cancelled': [],
};

// ─── Employee ─────────────────────────────────────────────────────────────────
export interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  department: Department;
  role: string;
  joiningDate: string;
  status: EmployeeStatus;
  skills: string[];
  leaveStart?: string | null;
  leaveEnd?: string | null;
  createdAt: string;
  updatedAt: string;
  taskCounts?: Record<string, number>;
}

export interface EmployeeFormData {
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  department: Department | '';
  role: string;
  joiningDate: string;
  status: EmployeeStatus;
  skills: string[];
  leaveStart?: string;
  leaveEnd?: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export interface EmployeeSnapshot {
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
}

export interface Task {
  _id: string;
  taskId: string;
  title: string;
  description?: string;
  assignedEmployee?: Employee | null;
  employeeSnapshot?: EmployeeSnapshot | null;
  department?: Department;
  priority: Priority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  completedDate?: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
}

export interface TaskFormData {
  title: string;
  description?: string;
  assignedEmployee?: string | null;
  department?: Department | '';
  priority: Priority | '';
  startDate: string;
  dueDate: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface EmployeeWorkload {
  employeeId: string;
  fullName: string;
  department: Department;
  role: string;
  status: EmployeeStatus;
  activeTaskCount: number;
  tasksByStatus: TaskStatus[];
}

export interface DashboardData {
  totalEmployees: number;
  activeEmployees: number;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  overdueTasks: number;
  employeeWorkload: EmployeeWorkload[];
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

// ─── Query Params ─────────────────────────────────────────────────────────────
export interface EmployeeFilters {
  search?: string;
  department?: Department | '';
  status?: EmployeeStatus | '';
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus | '';
  priority?: Priority | '';
  department?: Department | '';
  dueDateFrom?: string;
  dueDateTo?: string;
  employeeId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

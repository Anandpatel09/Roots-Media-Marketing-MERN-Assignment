import type {
  ApiResponse,
  DashboardData,
  Employee,
  EmployeeFilters,
  EmployeeFormData,
  PaginationMeta,
  PaginatedResponse,
  Task,
  TaskFilters,
  TaskFormData,
  TaskStatus,
} from '../types';
import { STATUS_TRANSITIONS, TASK_STATUSES } from '../types';

const STORAGE_KEY = 'roots-em-data';

interface LocalStore {
  employees: Employee[];
  tasks: Task[];
}

interface LocalResponse<T> {
  data: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStore(): LocalStore {
  const serialized = window.localStorage.getItem(STORAGE_KEY);
  if (serialized === null) return { employees: [], tasks: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('Saved browser data is invalid. Clear this app’s local storage to continue.');
  }

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.employees) ||
    !Array.isArray(parsed.tasks)
  ) {
    throw new Error('Saved browser data has an invalid format. Clear this app’s local storage to continue.');
  }

  return parsed as unknown as LocalStore;
}

function writeStore(store: LocalStore): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function response<T>(data: T): LocalResponse<T> {
  return { data };
}

function apiResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function timestamp(): string {
  return new Date().toISOString();
}

function createId(): string {
  return globalThis.crypto.randomUUID();
}

function getTaskCounts(employeeId: string, tasks: Task[]): Record<string, number> {
  return tasks.reduce<Record<string, number>>((counts, task) => {
    if (task.assignedEmployee?._id === employeeId) {
      counts[task.status] = (counts[task.status] || 0) + 1;
    }
    return counts;
  }, {});
}

function hydrateTask(task: Task, store: LocalStore): Task {
  const assignedEmployeeId = task.assignedEmployee?._id;
  const assignedEmployee = assignedEmployeeId
    ? store.employees.find((employee) => employee._id === assignedEmployeeId) || null
    : null;

  return {
    ...task,
    assignedEmployee,
    isOverdue:
      task.status !== 'Completed' &&
      task.status !== 'Cancelled' &&
      new Date(task.dueDate) < new Date(),
  };
}

function paginate<T>(
  items: T[],
  pageValue: number | undefined,
  limitValue: number | undefined
): { data: T[]; pagination: PaginationMeta } {
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.trunc(pageValue!)) : 1;
  const limit = Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.trunc(limitValue!))) : 10;
  const total = items.length;
  const start = (page - 1) * limit;

  return {
    data: items.slice(start, start + limit),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

function compareValues(a: string | undefined, b: string | undefined, order: 'asc' | 'desc'): number {
  const comparison = (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
  return order === 'asc' ? comparison : -comparison;
}

function getEmployeeList(filters: EmployeeFilters = {}): PaginatedResponse<Employee> {
  const store = readStore();
  const search = filters.search?.trim().toLowerCase();
  const employees = store.employees
    .filter((employee) => {
      const matchesSearch =
        !search ||
        [employee.fullName, employee.email, employee.employeeId].some((value) =>
          value.toLowerCase().includes(search)
        );
      return (
        matchesSearch &&
        (!filters.department || employee.department === filters.department) &&
        (!filters.status || employee.status === filters.status)
      );
    })
    .sort((a, b) => {
      const sortBy = filters.sortBy || 'createdAt';
      return compareValues(
        a[sortBy as keyof Employee] as string | undefined,
        b[sortBy as keyof Employee] as string | undefined,
        filters.order === 'asc' ? 'asc' : 'desc'
      );
    });

  return { success: true, ...paginate(employees, filters.page, filters.limit) };
}

function filterAndSortTasks(store: LocalStore, filters: TaskFilters = {}): Task[] {
  const search = filters.search?.trim().toLowerCase();
  const priorityOrder = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  return store.tasks
    .map((task) => hydrateTask(task, store))
    .filter((task) => {
      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search) ||
        (task.employeeSnapshot?.fullName.toLowerCase().includes(search) ?? false);
      const dueDate = task.dueDate.slice(0, 10);
      return (
        matchesSearch &&
        (!filters.status || task.status === filters.status) &&
        (!filters.priority || task.priority === filters.priority) &&
        (!filters.department || task.department === filters.department) &&
        (!filters.employeeId || task.assignedEmployee?._id === filters.employeeId) &&
        (!filters.dueDateFrom || dueDate >= filters.dueDateFrom) &&
        (!filters.dueDateTo || dueDate <= filters.dueDateTo)
      );
    })
    .sort((a, b) => {
      const order = filters.order === 'asc' ? 'asc' : 'desc';
      if (filters.sortBy === 'priority') {
        const difference = priorityOrder[a.priority] - priorityOrder[b.priority];
        return (order === 'asc' ? difference : -difference) ||
          compareValues(a.createdAt, b.createdAt, 'desc');
      }
      const sortBy = filters.sortBy === 'title' || filters.sortBy === 'dueDate'
        ? filters.sortBy
        : 'createdAt';
      return compareValues(a[sortBy], b[sortBy], order);
    });
}

function getTaskList(filters: TaskFilters = {}): PaginatedResponse<Task> {
  const store = readStore();
  const tasks = filterAndSortTasks(store, filters);
  return { success: true, ...paginate(tasks, filters.page, filters.limit) };
}

function findEmployee(employeeId: string, store = readStore()): Employee {
  const employee = store.employees.find((item) => item._id === employeeId);
  if (!employee) throw new Error('Employee not found');
  return employee;
}

function findTask(taskId: string, store = readStore()): Task {
  const task = store.tasks.find((item) => item._id === taskId);
  if (!task) throw new Error('Task not found');
  return task;
}

function makeEmployeeSnapshot(employee: Employee): NonNullable<Task['employeeSnapshot']> {
  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    email: employee.email,
    department: employee.department,
    role: employee.role,
  };
}

function validateAssignment(employee: Employee, startDate: string, tasks: Task[], currentTaskId?: string): void {
  if (employee.status === 'Inactive') {
    throw new Error('Cannot assign task to an Inactive employee');
  }

  if (
    employee.status === 'On Leave' &&
    employee.leaveStart &&
    employee.leaveEnd &&
    startDate >= employee.leaveStart.slice(0, 10) &&
    startDate <= employee.leaveEnd.slice(0, 10)
  ) {
    throw new Error(`Cannot assign task: employee is on leave from ${employee.leaveStart} to ${employee.leaveEnd}`);
  }

  const activeCount = tasks.filter(
    (task) =>
      task._id !== currentTaskId &&
      task.assignedEmployee?._id === employee._id &&
      (task.status === 'Todo' || task.status === 'In Progress')
  ).length;
  if (activeCount >= 3) {
    throw new Error('Employee already has 3 active tasks (maximum allowed). Cannot assign more.');
  }
}

function getTasksByEmployee(employeeId: string, tasks: Task[]): Task[] {
  return tasks.filter((task) => task.assignedEmployee?._id === employeeId);
}

function validateTaskDates(startDate: string, dueDate: string): void {
  if (!startDate || !dueDate || new Date(dueDate) < new Date(startDate)) {
    throw new Error('Due date cannot be before start date');
  }
}

function filteredTasks(filters: TaskFilters = {}): Task[] {
  return filterAndSortTasks(readStore(), filters);
}

function csvCell(value: unknown): string {
  const stringValue = value == null ? '' : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export const localEmployeeApi = {
  getAll: async (filters: EmployeeFilters = {}) => response(getEmployeeList(filters)),

  getById: async (id: string) => {
    const store = readStore();
    const employee = findEmployee(id, store);
    return response(apiResponse({
      ...employee,
      taskCounts: getTaskCounts(id, store.tasks),
    }));
  },

  create: async (data: EmployeeFormData) => {
    const store = readStore();
    const employeeId = data.employeeId.trim().toUpperCase();
    const email = data.email.trim().toLowerCase();
    if (store.employees.some((employee) => employee.employeeId.toUpperCase() === employeeId)) {
      throw new Error('An employee with this ID already exists');
    }
    if (store.employees.some((employee) => employee.email.toLowerCase() === email)) {
      throw new Error('An employee with this email already exists');
    }

    const now = timestamp();
    const employee: Employee = {
      ...data,
      _id: createId(),
      employeeId,
      email,
      phone: data.phone || '',
      department: data.department as Employee['department'],
      skills: data.skills || [],
      leaveStart: data.status === 'On Leave' ? data.leaveStart || null : null,
      leaveEnd: data.status === 'On Leave' ? data.leaveEnd || null : null,
      createdAt: now,
      updatedAt: now,
    };
    store.employees.push(employee);
    writeStore(store);
    return response(apiResponse(employee));
  },

  update: async (id: string, data: Partial<EmployeeFormData>) => {
    const store = readStore();
    const current = findEmployee(id, store);
    const nextStatus = data.status;
    if (nextStatus && nextStatus !== 'Active' && nextStatus !== current.status) {
      const activeCount = getTasksByEmployee(id, store.tasks).filter(
        (task) => task.status === 'Todo' || task.status === 'In Progress'
      ).length;
      if (activeCount > 0) {
        throw new Error(`Cannot change status: employee has ${activeCount} active task(s). Reassign or cancel tasks first.`);
      }
    }

    const nextEmployeeId = data.employeeId?.trim().toUpperCase() ?? current.employeeId;
    const nextEmail = data.email?.trim().toLowerCase() ?? current.email;
    if (store.employees.some((employee) => employee._id !== id && employee.employeeId.toUpperCase() === nextEmployeeId)) {
      throw new Error('An employee with this ID already exists');
    }
    if (store.employees.some((employee) => employee._id !== id && employee.email.toLowerCase() === nextEmail)) {
      throw new Error('An employee with this email already exists');
    }

    const employee: Employee = {
      ...current,
      ...data,
      employeeId: nextEmployeeId,
      email: nextEmail,
      leaveStart: (data.status ?? current.status) === 'On Leave'
        ? data.leaveStart ?? current.leaveStart
        : null,
      leaveEnd: (data.status ?? current.status) === 'On Leave'
        ? data.leaveEnd ?? current.leaveEnd
        : null,
      updatedAt: timestamp(),
    } as Employee;
    store.employees = store.employees.map((item) => item._id === id ? employee : item);
    writeStore(store);
    return response(apiResponse(employee));
  },

  delete: async (id: string) => {
    const store = readStore();
    const employee = findEmployee(id, store);
    const activeCount = getTasksByEmployee(id, store.tasks).filter(
      (task) => task.status === 'Todo' || task.status === 'In Progress'
    ).length;
    if (activeCount > 0) {
      throw new Error(`Cannot delete employee: they have ${activeCount} active task(s). Reassign or cancel tasks first.`);
    }

    store.employees = store.employees.filter((item) => item._id !== id);
    store.tasks = store.tasks.map((task) =>
      task.assignedEmployee?._id === id
        ? { ...task, assignedEmployee: null, updatedAt: timestamp() }
        : task
    );
    writeStore(store);
    return response({ success: true, message: `${employee.fullName} deleted successfully`, data: null });
  },
};

export const localTaskApi = {
  getAll: async (filters: TaskFilters = {}) => response(getTaskList(filters)),

  getById: async (id: string) => {
    const store = readStore();
    return response(apiResponse(hydrateTask(findTask(id, store), store)));
  },

  create: async (data: TaskFormData) => {
    const store = readStore();
    validateTaskDates(data.startDate, data.dueDate);
    if (data.title.trim().length < 3) throw new Error('Title must be at least 3 characters');
    if (!data.priority) throw new Error('Priority is required');

    const employee = data.assignedEmployee ? findEmployee(data.assignedEmployee, store) : null;
    if (employee) validateAssignment(employee, data.startDate, store.tasks);
    const nextTaskNumber = store.tasks.reduce((highest, task) => {
      const match = /^TASK-(\d+)$/.exec(task.taskId);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;
    const task: Task = {
      ...data,
      _id: createId(),
      taskId: `TASK-${String(nextTaskNumber).padStart(4, '0')}`,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      assignedEmployee: employee,
      employeeSnapshot: employee ? makeEmployeeSnapshot(employee) : null,
      department: data.department || undefined,
      priority: data.priority as Task['priority'],
      status: 'Todo',
      startDate: new Date(data.startDate).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
      completedDate: null,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    store.tasks.push(task);
    writeStore(store);
    return response(apiResponse(hydrateTask(task, store)));
  },

  update: async (id: string, data: Partial<TaskFormData>) => {
    const store = readStore();
    const current = findTask(id, store);
    if (current.status === 'Completed' || current.status === 'Cancelled') {
      throw new Error(`Cannot edit a ${current.status} task`);
    }

    const startDate = data.startDate || current.startDate;
    const dueDate = data.dueDate || current.dueDate;
    validateTaskDates(startDate, dueDate);
    const employeeId = data.assignedEmployee === undefined
      ? current.assignedEmployee?._id
      : data.assignedEmployee || undefined;
    const employee = employeeId ? findEmployee(employeeId, store) : null;
    if (employee) {
      validateAssignment(
        employee,
        startDate,
        store.tasks,
          id
      );
    }

    const updated: Task = {
      ...current,
      ...data,
      title: data.title?.trim() ?? current.title,
      description: data.description?.trim() ?? current.description,
      assignedEmployee: employee,
      employeeSnapshot: employee ? makeEmployeeSnapshot(employee) : null,
      department: data.department === '' ? undefined : data.department ?? current.department,
      priority: data.priority ? data.priority as Task['priority'] : current.priority,
      startDate: new Date(startDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      updatedAt: timestamp(),
    };
    store.tasks = store.tasks.map((task) => task._id === id ? updated : task);
    writeStore(store);
    return response(apiResponse(hydrateTask(updated, store)));
  },

  updateStatus: async (id: string, status: TaskStatus) => {
    const store = readStore();
    const task = findTask(id, store);
    if (!TASK_STATUSES.includes(status)) throw new Error('New status is invalid');
    if (!STATUS_TRANSITIONS[task.status].includes(status)) {
      throw new Error(`Invalid status transition: ${task.status} → ${status}.`);
    }
    const updated: Task = {
      ...task,
      status,
      completedDate: status === 'Completed' ? timestamp() : task.completedDate,
      updatedAt: timestamp(),
    };
    store.tasks = store.tasks.map((item) => item._id === id ? updated : item);
    writeStore(store);
    return response(apiResponse(hydrateTask(updated, store)));
  },

  exportCSV: (filters: TaskFilters = {}) => {
    const tasks = filteredTasks(filters);
    const headers = [
      'Task ID', 'Title', 'Description', 'Department', 'Priority', 'Status',
      'Assigned Employee ID', 'Assigned Employee Name', 'Assigned Employee Email',
      'Start Date', 'Due Date', 'Completed Date', 'Created Date', 'Is Overdue',
    ];
    const rows = tasks.map((task) => [
      task.taskId,
      task.title,
      task.description,
      task.department,
      task.priority,
      task.status,
      task.employeeSnapshot?.employeeId,
      task.employeeSnapshot?.fullName,
      task.employeeSnapshot?.email,
      task.startDate ? new Date(task.startDate).toLocaleDateString() : '',
      task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
      task.completedDate ? new Date(task.completedDate).toLocaleDateString() : '',
      task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '',
      task.isOverdue ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-export-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export const localDashboardApi = {
  get: async () => {
    const store = readStore();
    const tasksByStatus = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0])) as Record<TaskStatus, number>;
    store.tasks.forEach((task) => {
      tasksByStatus[task.status] += 1;
    });

    const employeeWorkload = store.employees
      .map((employee) => {
        const activeTasks = store.tasks.filter(
          (task) =>
            task.assignedEmployee?._id === employee._id &&
            (task.status === 'Todo' || task.status === 'In Progress')
        );
        return {
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          department: employee.department,
          role: employee.role,
          status: employee.status,
          activeTaskCount: activeTasks.length,
          tasksByStatus: activeTasks.map((task) => task.status),
        };
      })
      .filter((employee) => employee.activeTaskCount > 0)
      .sort((a, b) => b.activeTaskCount - a.activeTaskCount)
      .slice(0, 20);

    const data: DashboardData = {
      totalEmployees: store.employees.length,
      activeEmployees: store.employees.filter((employee) => employee.status === 'Active').length,
      totalTasks: store.tasks.length,
      tasksByStatus,
      overdueTasks: store.tasks.filter(
        (task) =>
          task.status !== 'Completed' &&
          task.status !== 'Cancelled' &&
          new Date(task.dueDate) < new Date()
      ).length,
      employeeWorkload,
    };
    return response(apiResponse(data));
  },
};

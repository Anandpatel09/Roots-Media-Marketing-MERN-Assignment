import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Eye, Pencil, Download, ChevronUp, ChevronDown, CheckSquare, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { taskApi } from '../../api/taskApi';
import type { Task, TaskFilters, TaskStatus } from '../../types';
import { DEPARTMENTS, PRIORITIES, TASK_STATUSES, STATUS_TRANSITIONS } from '../../types';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import { PriorityBadge, TaskStatusBadge, DepartmentBadge } from '../../components/Badges';
import Pagination from '../../components/Pagination';
import { LoadingSpinner, EmptyState, ErrorState } from '../../components/StateComponents';

export default function TaskList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const filters: TaskFilters = {
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as TaskFilters['status']) || '',
    priority: (searchParams.get('priority') as TaskFilters['priority']) || '',
    department: (searchParams.get('department') as TaskFilters['department']) || '',
    dueDateFrom: searchParams.get('dueDateFrom') || '',
    dueDateTo: searchParams.get('dueDateTo') || '',
    employeeId: searchParams.get('employeeId') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
  };

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const setSortBy = (col: string) => {
    const params = new URLSearchParams(searchParams);
    if (filters.sortBy === col) {
      params.set('order', filters.order === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', col);
      params.set('order', 'asc');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await taskApi.getAll(filters);
      setTasks(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      setStatusUpdating(task._id);
      await taskApi.updateStatus(task._id, newStatus);
      toast.success(`Task moved to "${newStatus}"`);
      fetchTasks();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatusUpdating(null);
    }
  };

  const hasFilters = filters.search || filters.status || filters.priority || filters.department || filters.dueDateFrom || filters.dueDateTo || filters.employeeId;

  const handleExportCSV = () => {
    taskApi.exportCSV(filters);
    toast.success('CSV export started');
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (filters.sortBy !== col) return <ChevronUp className="w-3.5 h-3.5 opacity-20" />;
    return filters.order === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-violet-400" /> : <ChevronDown className="w-3.5 h-3.5 text-violet-400" />;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Tasks</h2>
          <p className="text-slate-500 text-sm mt-1">{pagination.total} total tasks</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} className="btn-secondary" id="task-export-csv-btn">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link to="/tasks/new" className="btn-primary" id="task-add-btn">
            <Plus className="w-4 h-4" /> Add Task
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              id="task-search"
              placeholder="Search by title or employee name..."
              className="form-input pl-9"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>

          <select id="task-filter-status" className="form-select w-40" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select id="task-filter-priority" className="form-select w-40" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select id="task-filter-department" className="form-select w-44" value={filters.department} onChange={(e) => setFilter('department', e.target.value)}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">Due date:</span>
          </div>
          <input type="date" id="task-filter-due-from" className="form-input w-40 text-sm" value={filters.dueDateFrom} onChange={(e) => setFilter('dueDateFrom', e.target.value)} />
          <span className="text-slate-600 text-sm">to</span>
          <input type="date" id="task-filter-due-to" className="form-input w-40 text-sm" value={filters.dueDateTo} min={filters.dueDateFrom} onChange={(e) => setFilter('dueDateTo', e.target.value)} />

          {hasFilters && (
            <button
              onClick={() => { const p = new URLSearchParams(); p.set('page', '1'); setSearchParams(p); }}
              className="btn-ghost text-rose-400 hover:text-rose-300 text-sm"
              id="task-clear-filters-btn"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading tasks..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchTasks} />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No tasks found"
            description={hasFilters ? 'Try adjusting your filters' : 'Create your first task to get started'}
            icon={<CheckSquare className="w-12 h-12" />}
            action={<Link to="/tasks/new" className="btn-primary" id="task-empty-add-btn"><Plus className="w-4 h-4" /> Add Task</Link>}
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th><button className="flex items-center gap-1 hover:text-slate-200" onClick={() => setSortBy('title')} id="sort-task-title">Title <SortIcon col="title" /></button></th>
                    <th>Assigned To</th>
                    <th>Department</th>
                    <th><button className="flex items-center gap-1 hover:text-slate-200" onClick={() => setSortBy('priority')} id="sort-task-priority">Priority <SortIcon col="priority" /></button></th>
                    <th>Status</th>
                    <th><button className="flex items-center gap-1 hover:text-slate-200" onClick={() => setSortBy('dueDate')} id="sort-task-due-date">Due Date <SortIcon col="dueDate" /></button></th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const overdue = task.isOverdue || (task.status !== 'Completed' && task.status !== 'Cancelled' && new Date() > new Date(task.dueDate));
                    const nextStatuses = STATUS_TRANSITIONS[task.status] || [];
                    return (
                      <tr key={task._id}>
                        <td>
                          <div>
                            <p className="font-medium text-slate-200 max-w-48 truncate">{task.title}</p>
                            <p className="text-xs text-slate-500 font-mono">{task.taskId}</p>
                          </div>
                        </td>
                        <td>
                          {task.employeeSnapshot ? (
                            <div>
                              <p className="text-sm text-slate-200">{task.employeeSnapshot.fullName}</p>
                              <p className="text-xs text-slate-500">{task.employeeSnapshot.employeeId}</p>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-sm">Unassigned</span>
                          )}
                        </td>
                        <td>{task.department ? <DepartmentBadge department={task.department} /> : <span className="text-slate-600">—</span>}</td>
                        <td><PriorityBadge priority={task.priority} /></td>
                        <td>
                          <TaskStatusBadge status={task.status} isOverdue={overdue} />
                        </td>
                        <td>
                          <span className={`text-sm ${overdue ? 'text-rose-400 font-medium' : 'text-slate-400'}`}>
                            {formatDate(task.dueDate)}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1 justify-end">
                            {/* Status quick-change dropdown — only valid next statuses */}
                            {nextStatuses.length > 0 && (
                              <select
                                className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 cursor-pointer"
                                value={task.status}
                                onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                                disabled={statusUpdating === task._id}
                                id={`task-status-select-${task._id}`}
                                title="Change status"
                              >
                                <option value={task.status} disabled>{task.status}</option>
                                {nextStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                            <button
                              onClick={() => navigate(`/tasks/${task._id}`)}
                              className="btn-ghost w-8 h-8 p-0 justify-center"
                              aria-label="View task"
                              id={`task-view-${task._id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {task.status !== 'Completed' && task.status !== 'Cancelled' && (
                              <button
                                onClick={() => navigate(`/tasks/${task._id}/edit`)}
                                className="btn-ghost w-8 h-8 p-0 justify-center"
                                aria-label="Edit task"
                                id={`task-edit-${task._id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4">
              <Pagination pagination={pagination} onPageChange={(p) => setFilter('page', String(p))} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

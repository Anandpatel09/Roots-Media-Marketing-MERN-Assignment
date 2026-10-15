import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskApi } from '../../api/taskApi';
import { employeeApi } from '../../api/employeeApi';
import type { TaskFormData, Employee } from '../../types';
import { DEPARTMENTS, PRIORITIES } from '../../types';
import { toInputDate, getErrorMessage } from '../../utils/formatters';
import { LoadingSpinner } from '../../components/StateComponents';

interface TaskFormProps {
  mode: 'create' | 'edit';
}

const defaultForm: TaskFormData = {
  title: '',
  description: '',
  assignedEmployee: '',
  department: '',
  priority: '',
  startDate: '',
  dueDate: '',
};

export default function TaskForm({ mode }: TaskFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(mode === 'edit');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState('');

  // Load employees for dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeApi.getAll({ limit: 200 });
        setEmployees(res.data.data);
      } catch {
        // Silently fail — just show fewer options
      }
    };
    fetchEmployees();
  }, []);

  // Load task for edit
  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchTask = async () => {
        try {
          setFetchLoading(true);
          const res = await taskApi.getById(id);
          const task = res.data.data;

          if (task.status === 'Completed' || task.status === 'Cancelled') {
            toast.error(`Cannot edit a ${task.status} task`);
            navigate('/tasks');
            return;
          }

          setForm({
            title: task.title,
            description: task.description || '',
            assignedEmployee: task.assignedEmployee?._id || '',
            department: task.department || '',
            priority: task.priority,
            startDate: toInputDate(task.startDate),
            dueDate: toInputDate(task.dueDate),
          });
        } catch (err) {
          toast.error(getErrorMessage(err));
          navigate('/tasks');
        } finally {
          setFetchLoading(false);
        }
      };
      fetchTask();
    }
  }, [mode, id, navigate]);

  const setField = (key: keyof TaskFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.length < 3) e.title = 'Title must be at least 3 characters';
    if (!form.priority) e.priority = 'Priority is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.dueDate) e.dueDate = 'Due date is required';
    if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
      e.dueDate = 'Due date cannot be before start date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        ...form,
        assignedEmployee: form.assignedEmployee || null,
        department: form.department || undefined,
      };

      if (mode === 'create') {
        const res = await taskApi.create(payload);
        toast.success('Task created successfully!');
        navigate(`/tasks/${res.data.data._id}`);
      } else if (id) {
        await taskApi.update(id, payload);
        toast.success('Task updated successfully!');
        navigate(`/tasks/${id}`);
      }
    } catch (err: unknown) {
      const errObj = err as { message: string; errors?: { field: string; message: string }[] };
      if (errObj.errors && errObj.errors.length > 0) {
        const fieldErrors: Record<string, string> = {};
        errObj.errors.forEach(({ field, message }) => { fieldErrors[field] = message; });
        setErrors(fieldErrors);
        toast.error('Please fix the validation errors');
      } else {
        toast.error(errObj.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <LoadingSpinner text="Loading task..." />;

  const filteredEmployees = employees.filter((e) =>
    !empSearch || e.fullName.toLowerCase().includes(empSearch.toLowerCase()) || e.employeeId.toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost w-9 h-9 p-0 justify-center" id="task-form-back-btn">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="page-title">{mode === 'create' ? 'Add Task' : 'Edit Task'}</h2>
          <p className="text-slate-500 text-sm">{mode === 'create' ? 'Create a new task' : 'Update task information'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Basic */}
        <div className="card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Task Details</h3>

          <div>
            <label htmlFor="task-title" className="form-label">Title *</label>
            <input
              id="task-title"
              type="text"
              className="form-input"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
            />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="task-description" className="form-label">Description</label>
            <textarea
              id="task-description"
              rows={4}
              className="form-input resize-none"
              placeholder="Task description..."
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className="form-label">Priority *</label>
              <select id="task-priority" className="form-select" value={form.priority} onChange={(e) => setField('priority', e.target.value)}>
                <option value="">Select priority</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.priority && <p className="form-error">{errors.priority}</p>}
            </div>

            <div>
              <label htmlFor="task-department" className="form-label">Department</label>
              <select id="task-department" className="form-select" value={form.department} onChange={(e) => setField('department', e.target.value)}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="task-start-date" className="form-label">Start Date *</label>
              <input id="task-start-date" type="date" className="form-input" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
              {errors.startDate && <p className="form-error">{errors.startDate}</p>}
            </div>

            <div>
              <label htmlFor="task-due-date" className="form-label">Due Date *</label>
              <input id="task-due-date" type="date" className="form-input" value={form.dueDate} min={form.startDate} onChange={(e) => setField('dueDate', e.target.value)} />
              {errors.dueDate && <p className="form-error">{errors.dueDate}</p>}
            </div>
          </div>
        </div>

        {/* Employee Assignment */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Employee Assignment</h3>
          <p className="text-xs text-slate-500">Only Active employees (or On Leave employees whose leave doesn't overlap the task's start date) can be assigned.</p>

          {employees.length > 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="employee-search-in-task"
                type="text"
                className="form-input pl-9"
                placeholder="Search employees..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
              />
            </div>
          )}

          <select
            id="task-assigned-employee"
            className="form-select"
            value={form.assignedEmployee || ''}
            onChange={(e) => setField('assignedEmployee', e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {filteredEmployees.map((emp) => (
              <option
                key={emp._id}
                value={emp._id}
                disabled={emp.status === 'Inactive'}
              >
                {emp.fullName} ({emp.employeeId}) — {emp.status}
                {emp.status === 'Inactive' ? ' [Cannot assign]' : ''}
              </option>
            ))}
          </select>
          {errors.assignedEmployee && <p className="form-error">{errors.assignedEmployee}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary" id="task-form-cancel-btn">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary" id="task-form-submit-btn">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'create' ? 'Create Task' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

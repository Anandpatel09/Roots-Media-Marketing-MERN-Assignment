import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeApi } from '../../api/employeeApi';
import type { EmployeeFormData, EmployeeStatus } from '../../types';
import { DEPARTMENTS, EMPLOYEE_STATUSES } from '../../types';
import { toInputDate, getErrorMessage } from '../../utils/formatters';
import { LoadingSpinner } from '../../components/StateComponents';

interface EmployeeFormProps {
  mode: 'create' | 'edit';
}

const defaultForm: EmployeeFormData = {
  employeeId: '',
  fullName: '',
  email: '',
  phone: '',
  department: '',
  role: '',
  joiningDate: '',
  status: 'Active',
  skills: [],
  leaveStart: '',
  leaveEnd: '',
};

export default function EmployeeForm({ mode }: EmployeeFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState<EmployeeFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(mode === 'edit');
  const [skillInput, setSkillInput] = useState('');

  // Load existing employee for edit mode
  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchEmployee = async () => {
        try {
          setFetchLoading(true);
          const res = await employeeApi.getById(id);
          const emp = res.data.data;
          setForm({
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            email: emp.email,
            phone: emp.phone || '',
            department: emp.department,
            role: emp.role,
            joiningDate: toInputDate(emp.joiningDate),
            status: emp.status,
            skills: emp.skills || [],
            leaveStart: emp.leaveStart ? toInputDate(emp.leaveStart) : '',
            leaveEnd: emp.leaveEnd ? toInputDate(emp.leaveEnd) : '',
          });
        } catch (err) {
          toast.error(getErrorMessage(err));
          navigate('/employees');
        } finally {
          setFetchLoading(false);
        }
      };
      fetchEmployee();
    }
  }, [mode, id, navigate]);

  const setField = (key: keyof EmployeeFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setField('skills', [...form.skills, s]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setField('skills', form.skills.filter((s) => s !== skill));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.employeeId.trim()) e.employeeId = 'Employee ID is required';
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.department) e.department = 'Department is required';
    if (!form.role.trim()) e.role = 'Role is required';
    if (!form.joiningDate) e.joiningDate = 'Joining date is required';
    if (form.status === 'On Leave') {
      if (!form.leaveStart) e.leaveStart = 'Leave start date is required';
      if (!form.leaveEnd) e.leaveEnd = 'Leave end date is required';
      if (form.leaveStart && form.leaveEnd && form.leaveEnd < form.leaveStart) {
        e.leaveEnd = 'Leave end must be after leave start';
      }
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
        leaveStart: form.status === 'On Leave' ? form.leaveStart : undefined,
        leaveEnd: form.status === 'On Leave' ? form.leaveEnd : undefined,
      };

      if (mode === 'create') {
        await employeeApi.create(payload);
        toast.success('Employee created successfully!');
        navigate('/employees');
      } else if (id) {
        await employeeApi.update(id, payload);
        toast.success('Employee updated successfully!');
        navigate(`/employees/${id}`);
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

  if (fetchLoading) return <LoadingSpinner text="Loading employee..." />;

  const isOnLeave = form.status === 'On Leave';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost w-9 h-9 p-0 justify-center" id="employee-form-back-btn">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="page-title">{mode === 'create' ? 'Add Employee' : 'Edit Employee'}</h2>
          <p className="text-slate-500 text-sm">{mode === 'create' ? 'Create a new employee record' : 'Update employee information'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Basic Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="employee-id" className="form-label">Employee ID *</label>
              <input
                id="employee-id"
                type="text"
                className="form-input"
                placeholder="e.g. EMP-001"
                value={form.employeeId}
                onChange={(e) => setField('employeeId', e.target.value.toUpperCase())}
                disabled={mode === 'edit'}
              />
              {errors.employeeId && <p className="form-error">{errors.employeeId}</p>}
            </div>

            <div>
              <label htmlFor="full-name" className="form-label">Full Name *</label>
              <input
                id="full-name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
              />
              {errors.fullName && <p className="form-error">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="form-label">Email *</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="form-label">Phone</label>
              <input
                id="phone"
                type="tel"
                className="form-input"
                placeholder="+1 234 567 8900"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
              {errors.phone && <p className="form-error">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="department" className="form-label">Department *</label>
              <select
                id="department"
                className="form-select"
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <p className="form-error">{errors.department}</p>}
            </div>

            <div>
              <label htmlFor="role" className="form-label">Role *</label>
              <input
                id="role"
                type="text"
                className="form-input"
                placeholder="Software Engineer"
                value={form.role}
                onChange={(e) => setField('role', e.target.value)}
              />
              {errors.role && <p className="form-error">{errors.role}</p>}
            </div>

            <div>
              <label htmlFor="joining-date" className="form-label">Joining Date *</label>
              <input
                id="joining-date"
                type="date"
                className="form-input"
                value={form.joiningDate}
                onChange={(e) => setField('joiningDate', e.target.value)}
              />
              {errors.joiningDate && <p className="form-error">{errors.joiningDate}</p>}
            </div>

            <div>
              <label htmlFor="status" className="form-label">Status *</label>
              <select
                id="status"
                className="form-select"
                value={form.status}
                onChange={(e) => setField('status', e.target.value as EmployeeStatus)}
              >
                {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.status && <p className="form-error">{errors.status}</p>}
            </div>
          </div>

          {/* Leave dates — only shown when On Leave */}
          {isOnLeave && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div>
                <label htmlFor="leave-start" className="form-label">Leave Start Date *</label>
                <input
                  id="leave-start"
                  type="date"
                  className="form-input"
                  value={form.leaveStart}
                  onChange={(e) => setField('leaveStart', e.target.value)}
                />
                {errors.leaveStart && <p className="form-error">{errors.leaveStart}</p>}
              </div>
              <div>
                <label htmlFor="leave-end" className="form-label">Leave End Date *</label>
                <input
                  id="leave-end"
                  type="date"
                  className="form-input"
                  value={form.leaveEnd}
                  min={form.leaveStart}
                  onChange={(e) => setField('leaveEnd', e.target.value)}
                />
                {errors.leaveEnd && <p className="form-error">{errors.leaveEnd}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Skills</h3>
          <div className="flex gap-2">
            <input
              id="skill-input"
              type="text"
              className="form-input flex-1"
              placeholder="Add a skill (e.g. React, Python)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
            />
            <button type="button" onClick={addSkill} className="btn-secondary" id="add-skill-btn">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {form.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 text-sm border border-violet-500/20">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-rose-400 transition-colors"
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
            id="employee-form-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            id="employee-form-submit-btn"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'create' ? 'Create Employee' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

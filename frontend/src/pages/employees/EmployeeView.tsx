import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Pencil, Trash2, Mail, Phone, Calendar, Briefcase, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeApi } from '../../api/employeeApi';
import type { Employee } from '../../types';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import { EmployeeStatusBadge, DepartmentBadge } from '../../components/Badges';
import { LoadingSpinner, ErrorState, ConfirmDialog } from '../../components/StateComponents';

export default function EmployeeView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await employeeApi.getById(id);
        setEmployee(res.data.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await employeeApi.delete(id);
      toast.success('Employee deleted successfully');
      navigate('/employees');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading employee..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!employee) return null;

  const taskCounts = employee.taskCounts || {};
  const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost w-9 h-9 p-0 justify-center" id="employee-view-back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="page-title">{employee.fullName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-lg">
                {employee.employeeId}
              </span>
              <EmployeeStatusBadge status={employee.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/employees/${id}/edit`} className="btn-secondary" id="employee-view-edit-btn">
            <Pencil className="w-4 h-4" /> Edit
          </Link>
          <button onClick={() => setShowDelete(true)} className="btn-danger" id="employee-view-delete-btn">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="card p-6 space-y-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Contact & Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={<Mail />} label="Email" value={employee.email} />
            <InfoItem icon={<Phone />} label="Phone" value={employee.phone || '—'} />
            <InfoItem icon={<Briefcase />} label="Department" value={<DepartmentBadge department={employee.department} />} />
            <InfoItem icon={<Briefcase />} label="Role" value={employee.role} />
            <InfoItem icon={<Calendar />} label="Joining Date" value={formatDate(employee.joiningDate)} />
            <InfoItem icon={<Clock />} label="Member Since" value={formatDate(employee.createdAt)} />
          </div>

          {employee.status === 'On Leave' && employee.leaveStart && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-sm font-medium text-amber-400 mb-1">On Leave</p>
              <p className="text-sm text-slate-400">
                {formatDate(employee.leaveStart)} — {formatDate(employee.leaveEnd)}
              </p>
            </div>
          )}

          {employee.skills && employee.skills.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 mb-3 font-medium">Skills</p>
              <div className="flex flex-wrap gap-2">
                {employee.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 text-sm border border-violet-500/20">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Task stats */}
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-sm text-slate-500 mb-4 font-medium">Task Summary</p>
            <div className="space-y-3">
              {[
                { label: 'Todo', key: 'Todo', color: 'text-slate-400' },
                { label: 'In Progress', key: 'In Progress', color: 'text-violet-400' },
                { label: 'Completed', key: 'Completed', color: 'text-emerald-400' },
                { label: 'Cancelled', key: 'Cancelled', color: 'text-rose-400' },
              ].map(({ label, key, color }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className={`font-semibold ${color}`}>{taskCounts[key] || 0}</span>
                </div>
              ))}
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                <span className="text-sm text-slate-300 font-medium">Total</span>
                <span className="font-bold text-white">{totalTasks}</span>
              </div>
            </div>
          </div>

          <Link
            to={`/tasks?employeeId=${id}`}
            className="btn-secondary w-full justify-center"
            id="employee-view-tasks-link"
          >
            View All Tasks →
          </Link>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        title="Delete Employee"
        message={`Delete "${employee.fullName}"? This is permanent. Employees with active tasks cannot be deleted.`}
        confirmLabel="Delete Employee"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="text-sm text-slate-200 font-medium">{value}</div>
      </div>
    </div>
  );
}

// React import needed for cloneElement
import React from 'react';

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Pencil, Calendar, AlertTriangle, User, Building2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskApi } from '../../api/taskApi';
import type { Task, TaskStatus } from '../../types';
import { STATUS_TRANSITIONS } from '../../types';
import { formatDate, formatDateTime, getErrorMessage } from '../../utils/formatters';
import { PriorityBadge, TaskStatusBadge, DepartmentBadge } from '../../components/Badges';
import { LoadingSpinner, ErrorState } from '../../components/StateComponents';
import { Loader2 } from 'lucide-react';

export default function TaskView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchTask = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await taskApi.getById(id);
      setTask(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTask(); }, [id]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!id || !task) return;
    try {
      setStatusLoading(true);
      const res = await taskApi.updateStatus(id, newStatus);
      setTask(res.data.data);
      toast.success(`Status updated to "${newStatus}"`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading task..." />;
  if (error) return <ErrorState message={error} onRetry={fetchTask} />;
  if (!task) return null;

  const overdue = task.isOverdue || (task.status !== 'Completed' && task.status !== 'Cancelled' && new Date() > new Date(task.dueDate));
  const nextStatuses = STATUS_TRANSITIONS[task.status] || [];
  const canEdit = task.status !== 'Completed' && task.status !== 'Cancelled';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost w-9 h-9 p-0 justify-center mt-0.5" id="task-view-back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="page-title">{task.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="font-mono text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-lg">{task.taskId}</span>
              <PriorityBadge priority={task.priority} />
              <TaskStatusBadge status={task.status} isOverdue={overdue} />
            </div>
          </div>
        </div>
        {canEdit && (
          <Link to={`/tasks/${id}/edit`} className="btn-secondary flex-shrink-0" id="task-view-edit-btn">
            <Pencil className="w-4 h-4" /> Edit
          </Link>
        )}
      </div>

      {/* Overdue alert */}
      {overdue && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-400">This task is overdue</p>
            <p className="text-xs text-rose-400/70">Due {formatDate(task.dueDate)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {task.description && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Description</h3>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Assigned Employee */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Assigned Employee</h3>
            {task.employeeSnapshot ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-bold text-lg">
                  {task.employeeSnapshot.fullName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-200">{task.employeeSnapshot.fullName}</p>
                  <p className="text-sm text-slate-500">{task.employeeSnapshot.role} · {task.employeeSnapshot.department}</p>
                  <p className="text-xs font-mono text-violet-400">{task.employeeSnapshot.employeeId}</p>
                </div>
                {task.assignedEmployee && (
                  <Link
                    to={`/employees/${(task.assignedEmployee as { _id?: string })?._id || task.assignedEmployee}`}
                    className="btn-ghost text-xs"
                    id="task-view-employee-link"
                  >
                    View Profile →
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-slate-500">
                <User className="w-5 h-5" />
                <span className="text-sm">Unassigned</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status transition */}
          {nextStatuses.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Change Status</h3>
              <div className="space-y-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={statusLoading}
                    className="btn-secondary w-full justify-center"
                    id={`task-view-status-${s.replace(' ', '-').toLowerCase()}-btn`}
                  >
                    {statusLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Move to {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</h3>

            <DetailRow icon={<Building2 />} label="Department" value={task.department ? <DepartmentBadge department={task.department} /> : '—'} />
            <DetailRow icon={<Calendar />} label="Start Date" value={formatDate(task.startDate)} />
            <DetailRow icon={<Calendar />} label="Due Date" value={<span className={overdue ? 'text-rose-400' : ''}>{formatDate(task.dueDate)}</span>} />
            {task.completedDate && (
              <DetailRow icon={<Calendar />} label="Completed" value={<span className="text-emerald-400">{formatDate(task.completedDate)}</span>} />
            )}
            <DetailRow icon={<Clock />} label="Created" value={formatDateTime(task.createdAt)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="text-sm text-slate-200">{value}</div>
      </div>
    </div>
  );
}

import React from 'react';

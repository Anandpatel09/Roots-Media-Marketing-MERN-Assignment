import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckSquare, AlertTriangle, TrendingUp, UserCheck, Clock, Plus } from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardData } from '../types';
import { LoadingSpinner, ErrorState } from '../components/StateComponents';
import { EmployeeStatusBadge, DepartmentBadge } from '../components/Badges';
import { getErrorMessage } from '../utils/formatters';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  gradient: string;
  iconBg: string;
}

function StatCard({ icon, label, value, sub, gradient, iconBg }: StatCardProps) {
  return (
    <div className={`stat-card relative overflow-hidden`}>
      <div className={`absolute inset-0 opacity-5 ${gradient}`} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-sm text-slate-400 font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardApi.get();
      setData(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;
  if (!data) return null;

  const { tasksByStatus } = data;

  const statCards = [
    {
      label: 'Total Employees',
      value: data.totalEmployees,
      icon: <Users className="w-6 h-6 text-blue-400" />,
      sub: `${data.activeEmployees} active`,
      gradient: 'bg-blue-500',
      iconBg: 'bg-blue-500/20',
    },
    {
      label: 'Active Employees',
      value: data.activeEmployees,
      icon: <UserCheck className="w-6 h-6 text-emerald-400" />,
      sub: `${data.totalEmployees - data.activeEmployees} inactive/on leave`,
      gradient: 'bg-emerald-500',
      iconBg: 'bg-emerald-500/20',
    },
    {
      label: 'Total Tasks',
      value: data.totalTasks,
      icon: <CheckSquare className="w-6 h-6 text-violet-400" />,
      sub: `${(tasksByStatus['In Progress'] || 0)} in progress`,
      gradient: 'bg-violet-500',
      iconBg: 'bg-violet-500/20',
    },
    {
      label: 'Overdue Tasks',
      value: data.overdueTasks,
      icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
      sub: data.overdueTasks > 0 ? 'Needs attention' : 'All on track',
      gradient: 'bg-rose-500',
      iconBg: 'bg-rose-500/20',
    },
  ];

  const taskStatusItems = [
    { label: 'Todo', count: tasksByStatus['Todo'] || 0, color: 'bg-slate-400', text: 'text-slate-400' },
    { label: 'In Progress', count: tasksByStatus['In Progress'] || 0, color: 'bg-violet-400', text: 'text-violet-400' },
    { label: 'Completed', count: tasksByStatus['Completed'] || 0, color: 'bg-emerald-400', text: 'text-emerald-400' },
    { label: 'Cancelled', count: tasksByStatus['Cancelled'] || 0, color: 'bg-rose-400', text: 'text-rose-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Overview</h2>
          <p className="text-slate-500 text-sm mt-1">Welcome back — here's what's happening.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/employees/new" className="btn-secondary" id="dashboard-add-employee-btn">
            <Plus className="w-4 h-4" /> Employee
          </Link>
          <Link to="/tasks/new" className="btn-primary" id="dashboard-add-task-btn">
            <Plus className="w-4 h-4" /> Task
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Task status breakdown + workload */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Task by status */}
        <div className="card p-6 xl:col-span-1">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-white">Tasks by Status</h3>
          </div>
          <div className="space-y-4">
            {taskStatusItems.map(({ label, count, color, text }) => {
              const pct = data.totalTasks > 0 ? Math.round((count / data.totalTasks) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-slate-400">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${text}`}>{count}</span>
                      <span className="text-xs text-slate-600">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employee workload table */}
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold text-white">Employee Workload</h3>
            </div>
            <Link to="/employees" className="text-xs text-violet-400 hover:text-violet-300 transition-colors" id="dashboard-view-all-employees-link">
              View all →
            </Link>
          </div>
          {data.employeeWorkload.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No active tasks assigned.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th className="text-center">Active Tasks</th>
                    <th className="text-center">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employeeWorkload.map((emp) => (
                    <tr key={emp.employeeId}>
                      <td>
                        <div>
                          <p className="font-medium text-slate-200">{emp.fullName}</p>
                          <p className="text-xs text-slate-500">{emp.role}</p>
                        </div>
                      </td>
                      <td><DepartmentBadge department={emp.department} /></td>
                      <td><EmployeeStatusBadge status={emp.status} /></td>
                      <td className="text-center">
                        <span className="font-semibold text-white">{emp.activeTaskCount}</span>
                        <span className="text-slate-500 text-xs"> / 3</span>
                      </td>
                      <td className="text-center">
                        <div className="flex gap-1 justify-center">
                          {[1, 2, 3].map((slot) => (
                            <div
                              key={slot}
                              className={`w-3 h-3 rounded-sm ${
                                slot <= emp.activeTaskCount
                                  ? emp.activeTaskCount >= 3 ? 'bg-rose-500' : 'bg-violet-500'
                                  : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Trash2, Eye, Pencil, Users, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeApi } from '../../api/employeeApi';
import type { Employee, EmployeeFilters } from '../../types';
import { DEPARTMENTS, EMPLOYEE_STATUSES } from '../../types';
import { formatDate, getErrorMessage } from '../../utils/formatters';
import { EmployeeStatusBadge, DepartmentBadge } from '../../components/Badges';
import Pagination from '../../components/Pagination';
import { LoadingSpinner, EmptyState, ErrorState, ConfirmDialog } from '../../components/StateComponents';

export default function EmployeeList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Read filters from URL
  const filters: EmployeeFilters = {
    search: searchParams.get('search') || '',
    department: (searchParams.get('department') as EmployeeFilters['department']) || '',
    status: (searchParams.get('status') as EmployeeFilters['status']) || '',
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
      params.set('order', 'desc');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await employeeApi.getAll(filters);
      setEmployees(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await employeeApi.delete(deleteTarget._id);
      toast.success(`${deleteTarget.fullName} has been deleted`);
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
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
          <h2 className="page-title">Employees</h2>
          <p className="text-slate-500 text-sm mt-1">{pagination.total} total employees</p>
        </div>
        <Link to="/employees/new" className="btn-primary" id="employee-add-btn">
          <Plus className="w-4 h-4" /> Add Employee
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              id="employee-search"
              placeholder="Search by name, email, ID..."
              className="form-input pl-9"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>

          <select
            id="employee-filter-department"
            className="form-select w-44"
            value={filters.department}
            onChange={(e) => setFilter('department', e.target.value)}
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            id="employee-filter-status"
            className="form-select w-44"
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {(filters.search || filters.department || filters.status) && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                params.set('page', '1');
                setSearchParams(params);
              }}
              className="btn-ghost text-rose-400 hover:text-rose-300"
              id="employee-clear-filters-btn"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Loading employees..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchEmployees} />
        ) : employees.length === 0 ? (
          <EmptyState
            title="No employees found"
            description={filters.search || filters.department || filters.status
              ? "Try adjusting your search or filters"
              : "Get started by adding your first employee"}
            icon={<Users className="w-12 h-12" />}
            action={
              <Link to="/employees/new" className="btn-primary" id="employee-empty-add-btn">
                <Plus className="w-4 h-4" /> Add Employee
              </Link>
            }
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <button className="flex items-center gap-1 hover:text-slate-200" onClick={() => setSortBy('employeeId')} id="sort-employee-id">
                        Employee ID <SortIcon col="employeeId" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-slate-200" onClick={() => setSortBy('fullName')} id="sort-full-name">
                        Name <SortIcon col="fullName" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-slate-200" onClick={() => setSortBy('department')} id="sort-department">
                        Department <SortIcon col="department" />
                      </button>
                    </th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-slate-200" onClick={() => setSortBy('joiningDate')} id="sort-joining-date">
                        Joining Date <SortIcon col="joiningDate" />
                      </button>
                    </th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp._id}>
                      <td>
                        <span className="font-mono text-xs text-violet-400 bg-violet-500/10 px-2 py-1 rounded-lg">
                          {emp.employeeId}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium text-slate-200">{emp.fullName}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </td>
                      <td><DepartmentBadge department={emp.department} /></td>
                      <td className="text-slate-300 text-sm">{emp.role}</td>
                      <td><EmployeeStatusBadge status={emp.status} /></td>
                      <td className="text-slate-400 text-sm">{formatDate(emp.joiningDate)}</td>
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => navigate(`/employees/${emp._id}`)}
                            className="btn-ghost w-8 h-8 p-0 justify-center"
                            aria-label="View"
                            id={`employee-view-${emp._id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/employees/${emp._id}/edit`)}
                            className="btn-ghost w-8 h-8 p-0 justify-center"
                            aria-label="Edit"
                            id={`employee-edit-${emp._id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            className="btn-ghost w-8 h-8 p-0 justify-center text-rose-500 hover:text-rose-400"
                            aria-label="Delete"
                            id={`employee-delete-${emp._id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4">
              <Pagination
                pagination={pagination}
                onPageChange={(p) => setFilter('page', String(p))}
              />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Employee"
        message={`Are you sure you want to delete "${deleteTarget?.fullName}"? This action cannot be undone. (Note: employees with active tasks cannot be deleted.)`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

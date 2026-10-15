import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/employees': 'Employees',
  '/employees/new': 'Add Employee',
  '/tasks': 'Tasks',
  '/tasks/new': 'Add Task',
};

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.includes('/employees/') && pathname.includes('/edit')) return 'Edit Employee';
  if (pathname.includes('/tasks/') && pathname.includes('/edit')) return 'Edit Task';
  if (pathname.startsWith('/employees/')) return 'Employee Details';
  if (pathname.startsWith('/tasks/')) return 'Task Details';
  return 'HR Management';
}

export default function Navbar() {
  const location = useLocation();
  const title = getTitle(location.pathname);

  return (
    <header
      className="fixed top-0 right-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-6 z-20"
      style={{
        left: 'var(--sidebar-width)',
        height: 'var(--navbar-height)',
      }}
    >
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-3">
        <button
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Search"
          id="navbar-search-btn"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors relative"
          aria-label="Notifications"
          id="navbar-notifications-btn"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}

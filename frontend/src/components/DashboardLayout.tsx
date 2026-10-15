import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <Navbar />
      <main
        className="min-h-screen"
        style={{
          marginLeft: 'var(--sidebar-width)',
          paddingTop: 'var(--navbar-height)',
        }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

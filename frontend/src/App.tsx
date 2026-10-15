import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import EmployeeView from './pages/employees/EmployeeView';
import TaskList from './pages/tasks/TaskList';
import TaskForm from './pages/tasks/TaskForm';
import TaskView from './pages/tasks/TaskView';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-7xl font-black text-slate-700 mb-4">404</p>
      <h2 className="text-xl font-bold text-slate-300 mb-2">Page Not Found</h2>
      <p className="text-slate-500 mb-6">The page you're looking for doesn't exist.</p>
      <a href="/" className="btn-primary">Go Home</a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#a78bfa', secondary: '#1e293b' },
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#1e293b' },
          },
        }}
      />
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />

          {/* Employee routes */}
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/employees/new" element={<EmployeeForm mode="create" />} />
          <Route path="/employees/:id" element={<EmployeeView />} />
          <Route path="/employees/:id/edit" element={<EmployeeForm mode="edit" />} />

          {/* Task routes */}
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/tasks/new" element={<TaskForm mode="create" />} />
          <Route path="/tasks/:id" element={<TaskView />} />
          <Route path="/tasks/:id/edit" element={<TaskForm mode="edit" />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import POS from '@/pages/POS';
import Medicines from '@/pages/Medicines';
import Purchases from '@/pages/Purchases';
import Orders from '@/pages/Orders';
import Customers from '@/pages/Customers';
import Suppliers from '@/pages/Suppliers';
import Expenses from '@/pages/Expenses';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Loading...</div>;
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginRoute />,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'pos', element: <POS /> },
      { path: 'medicines', element: <Medicines /> },
      { path: 'purchases', element: <Purchases /> },
      { path: 'orders', element: <Orders /> },
      { path: 'customers', element: <Customers /> },
      { path: 'suppliers', element: <Suppliers /> },
      { path: 'expenses', element: <Expenses /> },
      { path: 'reports', element: <Reports /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

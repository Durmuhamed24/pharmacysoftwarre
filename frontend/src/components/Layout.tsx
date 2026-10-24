import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, LogOut, ShoppingCart, Pill, Truck, Users,
  ClipboardList, DollarSign, Settings as SettingsIcon,
  BarChart3, Menu, X,
} from 'lucide-react';

const navItems: Array<{ label: string; href: string; icon: typeof LayoutDashboard; roles: string[] }> = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'pharmacist', 'cashier'] },
  { label: 'POS / Billing', href: '/pos', icon: ShoppingCart, roles: ['owner', 'pharmacist', 'cashier'] },
  { label: 'Medicines', href: '/medicines', icon: Pill, roles: ['owner', 'pharmacist', 'cashier'] },
  { label: 'Purchases', href: '/purchases', icon: Truck, roles: ['owner', 'pharmacist'] },
  { label: 'Orders', href: '/orders', icon: ClipboardList, roles: ['owner', 'pharmacist', 'cashier'] },
  { label: 'Customers', href: '/customers', icon: Users, roles: ['owner', 'pharmacist', 'cashier'] },
  { label: 'Suppliers', href: '/suppliers', icon: Users, roles: ['owner', 'pharmacist'] },
  { label: 'Expenses', href: '/expenses', icon: DollarSign, roles: ['owner', 'pharmacist'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['owner', 'pharmacist'] },
  { label: 'Settings', href: '/settings', icon: SettingsIcon, roles: ['owner'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const items = navItems.filter((i) => i.roles.includes(user?.role || ''));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">
              Rx
            </div>
            <span className="font-bold text-lg text-gray-800">Al-Noor Pharmacy</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-white">
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 mb-1">{user?.role}</div>
            <div className="text-sm font-medium truncate">{user?.name}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">
              {items.find((i) => window.location.pathname === i.href)?.label || 'Pharmacy'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500">Rs. PKR</span>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                {user?.name.charAt(0)}
              </div>
              <span className="font-medium text-gray-700">{user?.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

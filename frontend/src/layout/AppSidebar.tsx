import { NavLink } from 'react-router';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '⊞', roles: ['super_admin', 'manager', 'worker'] },
  { to: '/clients', label: 'Clients', icon: '🏢', roles: ['super_admin', 'manager'] },
  { to: '/users', label: 'Team', icon: '👥', roles: ['super_admin', 'manager'] },
  { to: '/time-entries', label: 'Time Entries', icon: '⏱', roles: ['super_admin', 'manager', 'worker'] },
  { to: '/change-log', label: 'Change Log', icon: '📋', roles: ['super_admin', 'manager', 'worker'] },
  { to: '/reports', label: 'Reports', icon: '📊', roles: ['super_admin', 'manager', 'worker'] },
  { to: '/settings', label: 'Settings', icon: '⚙️', roles: ['super_admin'] },
  { to: '/profile', label: 'Profile', icon: '👤', roles: ['super_admin', 'manager', 'worker'] },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const visible = navItems.filter(n => user && n.roles.includes(user.role));

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <img
          src="/images/logo/healthscale-icon.png"
          alt="Health Scale Digital"
          className="w-9 h-9 object-contain"
        />
        <div>
          <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Health Scale</div>
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium leading-tight">Digital</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visible.map(item => (
          <NavLink key={item.to} to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`
            }>
            <span className="w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button onClick={logout}
          className="w-full text-left text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10">
          Sign out
        </button>
      </div>
    </aside>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layout/AppLayout';
import SignIn from './pages/SignIn';
import { ForgotPassword, ResetPassword, AcceptInvite } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Clients from './pages/Clients';
import TimeEntries from './pages/TimeEntries';
import ChangeLog from './pages/ChangeLog';
import Reports from './pages/Reports';
import ClientPortal from './pages/ClientPortal';
import { Settings, Profile } from './pages/SettingsPages';

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;

  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      <Route path="/client-portal" element={
        <PrivateRoute roles={['client']}>
          <ClientPortal />
        </PrivateRoute>
      } />

      <Route element={
        <PrivateRoute roles={['super_admin', 'manager', 'worker']}>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<PrivateRoute roles={['super_admin', 'manager']}><Users /></PrivateRoute>} />
        <Route path="/clients" element={<PrivateRoute roles={['super_admin', 'manager']}><Clients /></PrivateRoute>} />
        <Route path="/time-entries" element={<TimeEntries />} />
        <Route path="/time-entries/new" element={<TimeEntries />} />
        <Route path="/change-log" element={<ChangeLog />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<PrivateRoute roles={['super_admin']}><Settings /></PrivateRoute>} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/" element={
        user?.role === 'client' ? <Navigate to="/client-portal" replace /> :
        user ? <Navigate to="/dashboard" replace /> :
        <Navigate to="/signin" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

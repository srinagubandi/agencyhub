import { Outlet } from 'react-router';
import AppSidebar from './AppSidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppSidebar />
      <main className="flex-1 ml-64 p-8 max-w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

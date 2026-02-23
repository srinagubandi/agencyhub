import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router';

interface StatsCard { label: string; value: string | number; color: string; }

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentEntries, setRecentEntries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (user?.role === 'worker') {
          const data = await api.reports.myHours();
          setStats({ totalHours: data?.totalHours || 0 });
          setRecentEntries(data?.entries?.slice(0, 5) || []);
        } else if (user?.role !== 'client') {
          const [clients, users, entries] = await Promise.all([
            api.clients.list(),
            api.users.list(),
            api.timeEntries.list(),
          ]);
          setStats({
            clients: clients?.length || 0,
            users: users?.length || 0,
            entries: entries?.length || 0,
          });
          setRecentEntries((entries || []).slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.role]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>;

  const statsCards: StatsCard[] = user?.role === 'worker'
    ? [{ label: 'Hours This Month', value: Number(stats.totalHours || 0).toFixed(1), color: 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' }]
    : [
        { label: 'Total Clients', value: stats.clients || 0, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
        { label: 'Team Members', value: stats.users || 0, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
        { label: 'Time Entries', value: stats.entries || 0, color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstName}!
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening at your agency.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statsCards.map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 ${card.color}`}>
              {card.label}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {user?.role !== 'client' && (
            <Link to="/time-entries/new"
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors">
              + Log Hours
            </Link>
          )}
          {(user?.role === 'super_admin' || user?.role === 'manager') && (
            <>
              <Link to="/clients"
                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors">
                View Clients
              </Link>
              <Link to="/reports"
                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors">
                View Reports
              </Link>
            </>
          )}
          {user?.role === 'super_admin' && (
            <Link to="/users/invite"
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors">
              Invite User
            </Link>
          )}
        </div>
      </div>

      {/* Recent Time Entries */}
      {recentEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Time Entries</h3>
            <Link to="/time-entries" className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Campaign</th>
                  <th className="pb-3 font-medium text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {(recentEntries as Record<string, unknown>[]).map((entry: Record<string, unknown>) => (
                  <tr key={String(entry.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 text-gray-600 dark:text-gray-400">{String(entry.date).split('T')[0]}</td>
                    <td className="py-3 text-gray-900 dark:text-white">{`${entry.first_name} ${entry.last_name}`}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{String(entry.client_name || '')}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{String(entry.campaign_name || '')}</td>
                    <td className="py-3 text-right font-medium text-gray-900 dark:text-white">{String(entry.hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

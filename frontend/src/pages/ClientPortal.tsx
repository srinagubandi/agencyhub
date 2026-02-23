import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Campaign { id: string; name: string; status: string; channel_category?: string; platform?: string; }
interface TeamMember { id: string; first_name: string; last_name: string; role: string; }

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<{ totalHours?: number; campaigns?: Campaign[]; team?: TeamMember[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reports.clientPortal().then(d => { setData(d || {}); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || ''}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Client Portal</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">{user?.firstName} {user?.lastName}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : (
          <>
            {/* Total Hours Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total Hours This Month</div>
              <div className="text-6xl font-bold text-gray-900 dark:text-white">{Number(data.totalHours || 0).toFixed(1)}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Campaigns */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaigns</h3>
                {(data.campaigns || []).length === 0 ? (
                  <p className="text-gray-400 text-sm">No campaigns found.</p>
                ) : (
                  <div className="space-y-3">
                    {(data.campaigns || []).map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{c.name}</div>
                          {c.platform && <div className="text-xs text-gray-400">{c.platform}</div>}
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Team</h3>
                {(data.team || []).length === 0 ? (
                  <p className="text-gray-400 text-sm">No team members yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(data.team || []).map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 text-xs font-bold">
                          {m.first_name[0]}{m.last_name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{m.first_name} {m.last_name}</div>
                          <div className="text-xs text-gray-400 capitalize">{m.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

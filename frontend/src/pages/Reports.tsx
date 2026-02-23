import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type ReportTab = 'by_employee' | 'by_client' | 'by_campaign' | 'my_hours';

interface DateFilter { startDate: string; endDate: string; }

const now = new Date();
const defaultFilter: DateFilter = {
  startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
  endDate: now.toISOString().split('T')[0],
};

export default function Reports() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ReportTab>(user?.role === 'worker' ? 'my_hours' : 'by_employee');
  const [filter, setFilter] = useState<DateFilter>(defaultFilter);
  const [data, setData] = useState<unknown[]>([]);
  const [summary, setSummary] = useState<{ totalHours?: number }>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = { startDate: filter.startDate, endDate: filter.endDate };
      let res;
      if (tab === 'by_employee') res = await api.reports.hoursByEmployee(params);
      else if (tab === 'by_client') res = await api.reports.hoursByClient(params);
      else if (tab === 'by_campaign') res = await api.reports.hoursByCampaign(params);
      else {
        res = await api.reports.myHours(params);
        setSummary({ totalHours: res?.totalHours });
        setData(res?.entries || []);
        setLoading(false);
        return;
      }
      setData(res || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab, filter]);

  const tabs: { key: ReportTab; label: string }[] = user?.role === 'worker'
    ? [{ key: 'my_hours', label: 'My Hours' }]
    : [
        { key: 'by_employee', label: 'By Employee' },
        { key: 'by_client', label: 'By Client' },
        { key: 'by_campaign', label: 'By Campaign' },
      ];

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || ''}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">View-only. Filtered by date range.</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
          <input type="date" value={filter.startDate} onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</label>
          <input type="date" value={filter.endDate} onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* My Hours Summary */}
      {tab === 'my_hours' && summary.totalHours !== undefined && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Hours This Period</div>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">{Number(summary.totalHours).toFixed(2)}</div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'by_employee' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-6 py-3 font-medium">Employee</th>
                    <th className="px-6 py-3 font-medium text-right">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {(data as Record<string, unknown>[]).map((row) => (
                    <tr key={String(row.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{String(row.first_name)} {String(row.last_name)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{Number(row.total_hours).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'by_client' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium text-right">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {(data as Record<string, unknown>[]).map((row) => (
                    <tr key={String(row.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{String(row.name)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{Number(row.total_hours).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'by_campaign' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-6 py-3 font-medium">Campaign</th>
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Channel</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {(data as Record<string, unknown>[]).map((row) => (
                    <tr key={String(row.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{String(row.name)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{String(row.client_name || '')}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{String(row.platform || row.channel_category || '')}</td>
                      <td className="px-6 py-4"><StatusBadge status={String(row.status || '')} /></td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{Number(row.total_hours).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'my_hours' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Campaign</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium text-right">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {(data as Record<string, unknown>[]).map((row) => (
                    <tr key={String(row.id)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{String(row.date).split('T')[0]}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{String(row.client_name || '')}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{String(row.campaign_name || '')}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{String(row.description || '')}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">{Number(row.hours).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {data.length === 0 && <div className="p-8 text-center text-gray-400">No data for this period.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, FormEvent } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TimeEntry {
  id: string; date: string; hours: number; description: string;
  first_name: string; last_name: string; campaign_name: string;
  client_name: string; website_url: string; campaign_id: string;
}

interface Campaign { id: string; name: string; website_id: string; status: string; }
interface Website { id: string; url: string; account_id: string; }
interface Account { id: string; name: string; client_id: string; }
interface Client { id: string; name: string; }

export default function TimeEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ clientId: '', accountId: '', websiteId: '', campaignId: '', date: new Date().toISOString().split('T')[0], hours: '', description: '' });
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState({ startDate: '', endDate: '' });

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    const data = await api.timeEntries.list(params);
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    if (showForm) {
      api.clients.list().then(d => setClients(d || []));
    }
  }, [showForm]);

  const onClientChange = async (clientId: string) => {
    setForm(f => ({ ...f, clientId, accountId: '', websiteId: '', campaignId: '' }));
    setAccounts([]); setWebsites([]); setCampaigns([]);
    if (clientId) { const d = await api.accounts.list(clientId); setAccounts(d || []); }
  };

  const onAccountChange = async (accountId: string) => {
    setForm(f => ({ ...f, accountId, websiteId: '', campaignId: '' }));
    setWebsites([]); setCampaigns([]);
    if (accountId) { const d = await api.websites.list(accountId); setWebsites(d || []); }
  };

  const onWebsiteChange = async (websiteId: string) => {
    setForm(f => ({ ...f, websiteId, campaignId: '' }));
    setCampaigns([]);
    if (websiteId) { const d = await api.campaigns.list(websiteId); setCampaigns(d || []); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.timeEntries.create({
        campaignId: form.campaignId,
        date: form.date,
        hours: parseFloat(form.hours),
        description: form.description,
      });
      setShowForm(false);
      setForm({ clientId: '', accountId: '', websiteId: '', campaignId: '', date: new Date().toISOString().split('T')[0], hours: '', description: '' });
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await api.timeEntries.delete(id);
    load();
  };

  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Time Entries</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{totalHours.toFixed(2)} hours total</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium">
          + Log Hours
        </button>
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
        {(filter.startDate || filter.endDate) && (
          <div className="flex items-end">
            <button onClick={() => setFilter({ startDate: '', endDate: '' })} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">Clear</button>
          </div>
        )}
      </div>

      {/* Log Hours Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log Hours</h3>
            {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hours</label>
                  <input type="number" step="0.25" min="0.25" max="24" required value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                <select required value={form.clientId} onChange={e => onClientChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
                <select required value={form.accountId} onChange={e => onAccountChange(e.target.value)} disabled={!form.clientId}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm disabled:opacity-50">
                  <option value="">Select channel</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <select required value={form.websiteId} onChange={e => onWebsiteChange(e.target.value)} disabled={!form.accountId}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm disabled:opacity-50">
                  <option value="">Select website</option>
                  {websites.map(w => <option key={w.id} value={w.id}>{w.url}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign</label>
                <select required value={form.campaignId} onChange={e => setForm(f => ({ ...f, campaignId: e.target.value }))} disabled={!form.websiteId}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm disabled:opacity-50">
                  <option value="">Select campaign</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (min 10 chars)</label>
                <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} minLength={10} placeholder="What did you work on?"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium">Log Hours</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-3 font-medium">Date</th>
                  {user?.role !== 'worker' && <th className="px-6 py-3 font-medium">Employee</th>}
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium text-right">Hours</th>
                  {user?.role === 'super_admin' && <th className="px-6 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">{String(e.date).split('T')[0]}</td>
                    {user?.role !== 'worker' && <td className="px-6 py-4 text-gray-900 dark:text-white">{e.first_name} {e.last_name}</td>}
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{e.client_name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{e.campaign_name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{e.description}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{Number(e.hours).toFixed(2)}</td>
                    {user?.role === 'super_admin' && (
                      <td className="px-6 py-4">
                        <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length === 0 && <div className="p-8 text-center text-gray-400">No entries found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

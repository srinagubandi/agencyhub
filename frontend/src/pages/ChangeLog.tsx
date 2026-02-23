import { useEffect, useState, FormEvent } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface LogEntry {
  id: string; entity_type: string; entity_id: string; entry_type: string;
  title: string; body: string; created_at: string;
  first_name?: string; last_name?: string;
}

export default function ChangeLog() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ entityType: 'campaign', entityId: '', title: '', body: '' });
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await api.changeLog.list();
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.changeLog.create(form);
      setShowForm(false);
      setForm({ entityType: 'campaign', entityId: '', title: '', body: '' });
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Change Log</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">System events and manual notes</p>
        </div>
        {user?.role !== 'client' && (
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium">
            + Add Note
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Manual Note</h3>
            {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</label>
                <select value={form.entityType} onChange={e => setForm(f => ({ ...f, entityType: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
                  <option value="campaign">Campaign</option>
                  <option value="website">Website</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity ID</label>
                <input required value={form.entityId} onChange={e => setForm(f => ({ ...f, entityId: e.target.value }))}
                  placeholder="Paste the campaign or website UUID"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input required maxLength={200} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
                <textarea required rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium">Add Note</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-gray-400">No change log entries yet.</div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.entry_type === 'system' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                      {entry.entry_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      {entry.entity_type}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{entry.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{entry.body}</p>
                  {entry.first_name && (
                    <p className="text-xs text-gray-400 mt-2">by {entry.first_name} {entry.last_name}</p>
                  )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

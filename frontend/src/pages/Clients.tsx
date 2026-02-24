import { useEffect, useState, FormEvent, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Client { id: string; name: string; logo_url?: string; is_active: boolean; managers?: unknown[]; }
interface Account { id: string; name: string; client_id: string; }
interface Website { id: string; url: string; account_id: string; }
interface Campaign { id: string; name: string; status: string; channel_category?: string; platform?: string; website_id: string; workers?: unknown[]; }

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || ''}`}>{status}</span>;
};

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<{ client?: Client; account?: Account; website?: Website }>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'client' | 'account' | 'website' | 'campaign' | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  // Logo upload state — tracks upload status per client
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState('');
  const logoFileRef = useRef<HTMLInputElement>(null);

  const loadClients = async () => {
    const data = await api.clients.list();
    setClients(data || []);
  };

  useEffect(() => {
    api.clients.list().then(d => { setClients(d || []); setLoading(false); });
  }, []);

  const selectClient = async (c: Client) => {
    setSelected({ client: c });
    setWebsites([]); setCampaigns([]);
    setLogoMsg('');
    const data = await api.accounts.list(c.id);
    setAccounts(data || []);
  };

  const selectAccount = async (a: Account) => {
    setSelected(s => ({ ...s, account: a }));
    setCampaigns([]);
    const data = await api.websites.list(a.id);
    setWebsites(data || []);
  };

  const selectWebsite = async (w: Website) => {
    setSelected(s => ({ ...s, website: w }));
    const data = await api.campaigns.list(w.id);
    setCampaigns(data || []);
  };

  // Handle logo file selection and upload for the currently selected client
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected.client) return;
    setLogoUploading(true);
    setLogoMsg('');
    try {
      const data = await api.uploads.clientLogo(selected.client.id, file);
      // Update the client's logo_url in local state immediately (no full reload needed)
      const updatedClient = { ...selected.client, logo_url: data?.url || selected.client.logo_url };
      setSelected(s => ({ ...s, client: updatedClient }));
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      setLogoMsg('Logo updated!');
      setTimeout(() => setLogoMsg(''), 3000);
    } catch (err: unknown) {
      setLogoMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLogoUploading(false);
      // Reset the file input so the same file can be re-selected if needed
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (showForm === 'client') {
        await api.clients.create({ name: formData.name });
        await loadClients();
      } else if (showForm === 'account' && selected.client) {
        await api.accounts.create({ clientId: selected.client.id, name: formData.name });
        const data = await api.accounts.list(selected.client.id);
        setAccounts(data || []);
      } else if (showForm === 'website' && selected.account) {
        await api.websites.create({ accountId: selected.account.id, url: formData.url });
        const data = await api.websites.list(selected.account.id);
        setWebsites(data || []);
      } else if (showForm === 'campaign' && selected.website) {
        await api.campaigns.create({ websiteId: selected.website.id, name: formData.name, channelCategory: formData.channelCategory, platform: formData.platform });
        const data = await api.campaigns.list(selected.website.id);
        setCampaigns(data || []);
      }
      setShowForm(null); setFormData({});
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const canEdit = user?.role === 'super_admin' || user?.role === 'manager';

  const CHANNEL_TYPES = [
    ['Search', ['Google Ads', 'Bing Ads']],
    ['Social', ['Facebook Ads', 'Instagram Ads', 'LinkedIn Ads', 'TikTok Ads', 'X (Twitter) Ads', 'Pinterest Ads']],
    ['Display', ['Google Display Network', 'Programmatic Display']],
    ['Email', ['Email Marketing', 'SMS Marketing']],
    ['SEO', ['On-Page SEO', 'Off-Page SEO', 'Technical SEO', 'Local SEO']],
    ['Content', ['Blog Content', 'Video Content', 'Podcast']],
    ['Analytics', ['GA4 Setup', 'Tag Management', 'Reporting']],
  ] as [string, string[]][];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Agency → Clients → Accounts → Websites → Campaigns</p>
        </div>
        {user?.role === 'super_admin' && (
          <button onClick={() => { setShowForm('client'); setFormData({}); }}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium">
            + New Client
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      {selected.client && (
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <button onClick={() => setSelected({})} className="hover:text-brand-600">Clients</button>
          <span>/</span>
          <button onClick={() => setSelected(s => ({ client: s.client }))} className="hover:text-brand-600">{selected.client.name}</button>
          {selected.account && (<><span>/</span><button onClick={() => setSelected(s => ({ client: s.client, account: s.account }))} className="hover:text-brand-600">{selected.account.name}</button></>)}
          {selected.website && (<><span>/</span><span className="text-gray-900 dark:text-white">{selected.website.url}</span></>)}
        </nav>
      )}

      {/* Client Logo Panel — shown when a client is selected, only editable by super_admin */}
      {selected.client && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-5">
            {/* Logo preview */}
            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600">
              {selected.client.logo_url ? (
                <img src={selected.client.logo_url} alt={`${selected.client.name} logo`} className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-400 text-xs text-center px-1">No logo</span>
              )}
            </div>

            {/* Client name and logo upload controls */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">{selected.client.name}</h3>
              {user?.role === 'super_admin' && (
                <div className="mt-2 flex items-center gap-3">
                  {/* Hidden file input — triggered by the button below */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={logoFileRef}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    disabled={logoUploading}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {logoUploading ? 'Uploading...' : selected.client.logo_url ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  <span className="text-xs text-gray-400">JPEG, PNG, WebP — max 2MB</span>
                  {logoMsg && (
                    <span className={`text-xs font-medium ${logoMsg.includes('failed') || logoMsg.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>
                      {logoMsg}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {showForm === 'client' ? 'New Client' : showForm === 'account' ? 'New Account' : showForm === 'website' ? 'New Website' : 'New Campaign'}
            </h3>
            {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {showForm === 'website' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website URL</label>
                  <input required value={formData.url || ''} onChange={e => setFormData(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                </div>
              ) : showForm === 'campaign' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name</label>
                    <input required value={formData.name || ''} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel Category</label>
                    <select value={formData.channelCategory || ''} onChange={e => setFormData(f => ({ ...f, channelCategory: e.target.value, platform: '' }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
                      <option value="">Select category</option>
                      {CHANNEL_TYPES.map(([cat]) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  {formData.channelCategory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                      <select value={formData.platform || ''} onChange={e => setFormData(f => ({ ...f, platform: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
                        <option value="">Select platform</option>
                        {CHANNEL_TYPES.find(([cat]) => cat === formData.channelCategory)?.[1].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input required value={formData.name || ''} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium">Create</button>
                <button type="button" onClick={() => setShowForm(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Clients list — shows logo thumbnail next to each client name */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-900 dark:text-white flex justify-between items-center">
            <span>Clients</span>
            <span className="text-xs text-gray-400 font-normal">{clients.length}</span>
          </div>
          {loading ? <div className="p-4 text-center text-gray-400 text-sm">Loading...</div> : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {clients.map(c => (
                <button key={c.id} onClick={() => selectClient(c)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3 ${selected.client?.id === c.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {/* Small logo thumbnail in the client list row */}
                  <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-gray-400 text-xs font-bold">{c.name[0]}</span>
                    )}
                  </div>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
              {clients.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">No clients yet</div>}
            </div>
          )}
        </div>

        {/* Accounts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-900 dark:text-white flex justify-between items-center">
            <span>Accounts</span>
            {selected.client && canEdit && (
              <button onClick={() => { setShowForm('account'); setFormData({}); }} className="text-xs text-brand-600 hover:text-brand-700">+ Add</button>
            )}
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {!selected.client ? <div className="p-4 text-center text-gray-400 text-sm">Select a client</div> :
              accounts.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">No accounts</div> :
                accounts.map(a => (
                  <button key={a.id} onClick={() => selectAccount(a)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selected.account?.id === a.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {a.name}
                  </button>
                ))
            }
          </div>
        </div>

        {/* Websites */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-900 dark:text-white flex justify-between items-center">
            <span>Websites</span>
            {selected.account && canEdit && (
              <button onClick={() => { setShowForm('website'); setFormData({}); }} className="text-xs text-brand-600 hover:text-brand-700">+ Add</button>
            )}
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {!selected.account ? <div className="p-4 text-center text-gray-400 text-sm">Select an account</div> :
              websites.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">No websites</div> :
                websites.map(w => (
                  <button key={w.id} onClick={() => selectWebsite(w)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 truncate ${selected.website?.id === w.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {w.url}
                  </button>
                ))
            }
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-900 dark:text-white flex justify-between items-center">
            <span>Campaigns</span>
            {selected.website && canEdit && (
              <button onClick={() => { setShowForm('campaign'); setFormData({}); }} className="text-xs text-brand-600 hover:text-brand-700">+ Add</button>
            )}
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {!selected.website ? <div className="p-4 text-center text-gray-400 text-sm">Select a website</div> :
              campaigns.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">No campaigns</div> :
                campaigns.map(c => (
                  <div key={c.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{c.name}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    {c.platform && <div className="text-xs text-gray-400 mt-0.5">{c.platform}</div>}
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

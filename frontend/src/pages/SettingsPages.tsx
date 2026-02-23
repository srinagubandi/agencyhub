import { useEffect, useState, FormEvent, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function Settings() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.settings.get().then(d => {
      setCompanyName(d?.company_name || '');
      setLogoUrl(d?.logo_url || '');
    });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api.settings.update({ companyName });
    setMsg('Saved!');
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await api.uploads.agencyLogo(file);
    setLogoUrl(data?.url || '');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Agency Settings</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your agency profile</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Agency Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Agency Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-400 text-xs text-center">No logo</span>
              )}
            </div>
            <div>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleLogoUpload} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Upload Logo
              </button>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 2MB</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company Name</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {msg && <span className="text-sm text-green-600">{msg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

export function Profile() {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await api.uploads.workerPhoto(file);
    setPhotoUrl(data?.url || '');
    setMsg('Photo updated!');
    setTimeout(() => setMsg(''), 3000);
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '??';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Your account information</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-700 dark:text-brand-400 text-xl font-bold">{initials}</span>
            )}
          </div>
          <div>
            <input type="file" accept="image/*" ref={fileRef} onChange={handlePhotoUpload} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Upload Photo
            </button>
            {msg && <p className="text-xs text-green-600 mt-1">{msg}</p>}
            <p className="text-xs text-gray-400 mt-1">256×256px · WebP preferred</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">First Name</label>
            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm">{user?.firstName}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Last Name</label>
            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm">{user?.lastName}</div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm">{user?.email}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Role</label>
            <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

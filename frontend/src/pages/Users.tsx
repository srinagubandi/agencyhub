import { useEffect, useState, FormEvent } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string; email: string; first_name: string; last_name: string;
  role: string; is_active: boolean; created_at: string;
}

const RoleBadge = ({ role }: { role: string }) => {
  const colors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    worker: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    client: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-100 text-gray-700'}`}>
      {role.replace('_', ' ')}
    </span>
  );
};

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'worker' });
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Inline role-change state — tracks which user row is being edited
  const [editRoleUserId, setEditRoleUserId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState('');

  // Admin set-password modal state
  const [pwModalUser, setPwModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwModalError, setPwModalError] = useState('');
  const [pwModalSuccess, setPwModalSuccess] = useState('');
  const [pwModalSaving, setPwModalSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.users.list();
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError('');
    try {
      await api.users.invite(inviteForm);
      setInviteSuccess(`Invite sent to ${inviteForm.email}`);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'worker' });
      load();
      setTimeout(() => { setInviteSuccess(''); setShowInvite(false); }, 3000);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleToggleActive = async (u: User) => {
    await api.users.update(u.id, { isActive: !u.is_active });
    load();
  };

  // Open the inline role editor for a specific user row
  const startEditRole = (u: User) => {
    setEditRoleUserId(u.id);
    setEditRoleValue(u.role);
  };

  // Save the changed role and close the editor
  const saveRole = async (u: User) => {
    if (editRoleValue !== u.role) {
      await api.users.update(u.id, { role: editRoleValue });
      load();
    }
    setEditRoleUserId(null);
  };

  // Open the set-password modal for a specific user
  const openPwModal = (u: User) => {
    setPwModalUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setPwModalError('');
    setPwModalSuccess('');
  };

  // Close and reset the set-password modal
  const closePwModal = () => {
    setPwModalUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setPwModalError('');
    setPwModalSuccess('');
  };

  // Handle admin password change form submission
  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwModalError('');
    setPwModalSuccess('');

    if (newPassword.length < 8) {
      setPwModalError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwModalError('Passwords do not match.');
      return;
    }

    setPwModalSaving(true);
    try {
      const result = await api.users.setPassword(pwModalUser!.id, newPassword);
      setPwModalSuccess(result?.message || 'Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      // Auto-close the modal after a short delay
      setTimeout(() => closePwModal(), 2500);
    } catch (err: unknown) {
      setPwModalError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setPwModalSaving(false);
    }
  };

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{users.length} users in your agency</p>
        </div>
        {me?.role === 'super_admin' && (
          <button onClick={() => setShowInvite(!showInvite)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors">
            + Invite User
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invite New User</h3>
          {inviteError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{inviteError}</div>}
          {inviteSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{inviteSuccess}</div>}
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <input required value={inviteForm.firstName} onChange={e => setInviteForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <input required value={inviteForm.lastName} onChange={e => setInviteForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" required value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              {/* super_admin option included so admins can invite other admins */}
              <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm">
                <option value="worker">Worker</option>
                <option value="manager">Manager</option>
                <option value="client">Client</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium">Send Invite</button>
              <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Set-Password Modal */}
      {pwModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Set Password</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Setting a new password for <strong>{pwModalUser.first_name} {pwModalUser.last_name}</strong> ({pwModalUser.email}).
              No current password is required for admin overrides.
            </p>

            {pwModalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{pwModalError}</div>
            )}
            {pwModalSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{pwModalSuccess}</div>
            )}

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pwModalSaving}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {pwModalSaving ? 'Saving...' : 'Set Password'}
                </button>
                <button
                  type="button"
                  onClick={closePwModal}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm" />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  {me?.role === 'super_admin' && <th className="px-6 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-400 text-xs font-bold">
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{u.email}</td>

                    {/* Role cell — shows inline dropdown editor when editRoleUserId matches */}
                    <td className="px-6 py-4">
                      {me?.role === 'super_admin' && u.id !== me.id && editRoleUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRoleValue}
                            onChange={e => setEditRoleValue(e.target.value)}
                            className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="worker">Worker</option>
                            <option value="manager">Manager</option>
                            <option value="client">Client</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          <button onClick={() => saveRole(u)} className="text-xs px-2 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg">Save</button>
                          <button onClick={() => setEditRoleUserId(null)} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg">✕</button>
                        </div>
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>

                    {/* Actions column — only visible to super_admin */}
                    {me?.role === 'super_admin' && (
                      <td className="px-6 py-4">
                        {u.id !== me.id && (
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Change role — opens inline dropdown */}
                            <button
                              onClick={() => startEditRole(u)}
                              className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                            >
                              Change Role
                            </button>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            {/* Set password — opens modal */}
                            <button
                              onClick={() => openPwModal(u)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                            >
                              Set Password
                            </button>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            {/* Activate / Deactivate toggle */}
                            <button
                              onClick={() => handleToggleActive(u)}
                              className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-gray-400">No users found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { api } from '../services/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await api.auth.forgotPassword(email); setSent(true); } catch { setSent(true); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3"><img src="/images/logo/healthscale-icon.png" alt="Health Scale Digital" className="w-12 h-12 object-contain" /></div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Health Scale Digital</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Reset your password</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-lg font-medium">Check your email!</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">If that email exists, we sent a reset link.</p>
              <Link to="/signin" className="text-brand-600 hover:text-brand-700 text-sm font-medium">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold disabled:opacity-50">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <div className="text-center">
                <Link to="/signin" className="text-sm text-brand-600 hover:text-brand-700">Back to sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token') || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      navigate('/signin?reset=success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3"><img src="/images/logo/healthscale-icon.png" alt="Health Scale Digital" className="w-12 h-12 object-contain" /></div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Health Scale Digital</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Set a new password</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm password</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold disabled:opacity-50">
              {loading ? 'Saving...' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token') || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      const data = await api.auth.acceptInvite(token, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3"><img src="/images/logo/healthscale-icon.png" alt="Health Scale Digital" className="w-12 h-12 object-contain" /></div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Health Scale Digital</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Accept your invitation</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Create password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm password</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold disabled:opacity-50">
              {loading ? 'Activating account...' : 'Activate account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

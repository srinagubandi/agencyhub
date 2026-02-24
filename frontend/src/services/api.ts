const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getToken = () => localStorage.getItem('token');

const request = async (method: string, path: string, body?: unknown, isFormData = false) => {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/signin';
    return null;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body: unknown) => request('POST', path, body),
  patch: (path: string, body: unknown) => request('PATCH', path, body),
  delete: (path: string) => request('DELETE', path),
  upload: (path: string, formData: FormData) => request('POST', path, formData, true),

  // Auth
  auth: {
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
    me: () => api.get('/auth/me'),
    forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
    acceptInvite: (token: string, password: string) => api.post('/auth/accept-invite', { token, password }),
    // Change password for the currently authenticated user
    changePassword: (currentPassword: string, newPassword: string) =>
      api.post('/auth/change-password', { currentPassword, newPassword }),
  },

  // Users
  users: {
    list: (role?: string) => api.get(`/users${role ? `?role=${role}` : ''}`),
    get: (id: string) => api.get(`/users/${id}`),
    invite: (data: unknown) => api.post('/users', data),
    update: (id: string, data: unknown) => api.patch(`/users/${id}`, data),
    deactivate: (id: string) => api.delete(`/users/${id}`),
    // Super admin only — set a new password for any user without requiring their current password
    setPassword: (id: string, newPassword: string) => api.post(`/users/${id}/set-password`, { newPassword }),
  },

  // Clients
  clients: {
    list: () => api.get('/clients'),
    get: (id: string) => api.get(`/clients/${id}`),
    create: (data: unknown) => api.post('/clients', data),
    update: (id: string, data: unknown) => api.patch(`/clients/${id}`, data),
    deactivate: (id: string) => api.delete(`/clients/${id}`),
    assignManager: (id: string, managerId: string) => api.post(`/clients/${id}/managers`, { managerId }),
    removeManager: (id: string, managerId: string) => api.delete(`/clients/${id}/managers/${managerId}`),
  },

  // Accounts
  accounts: {
    list: (clientId: string) => api.get(`/accounts?clientId=${clientId}`),
    create: (data: unknown) => api.post('/accounts', data),
    update: (id: string, data: unknown) => api.patch(`/accounts/${id}`, data),
  },

  // Websites
  websites: {
    list: (accountId: string) => api.get(`/websites?accountId=${accountId}`),
    // Fetch all websites for a client (across all its accounts) — used by the new column order
    listByClient: (clientId: string) => api.get(`/websites?clientId=${clientId}`),
    create: (data: unknown) => api.post('/websites', data),
    update: (id: string, data: unknown) => api.patch(`/websites/${id}`, data),
  },

  // Campaigns
  campaigns: {
    list: (websiteId: string) => api.get(`/campaigns?websiteId=${websiteId}`),
    myAssigned: () => api.get('/campaigns?workerId=me'),
    get: (id: string) => api.get(`/campaigns/${id}`),
    create: (data: unknown) => api.post('/campaigns', data),
    update: (id: string, data: unknown) => api.patch(`/campaigns/${id}`, data),
    assignWorker: (id: string, workerId: string) => api.post(`/campaigns/${id}/workers`, { workerId }),
    removeWorker: (id: string, workerId: string) => api.delete(`/campaigns/${id}/workers/${workerId}`),
  },

  // Time Entries
  timeEntries: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return api.get(`/time-entries${qs}`);
    },
    create: (data: unknown) => api.post('/time-entries', data),
    update: (id: string, data: unknown) => api.patch(`/time-entries/${id}`, data),
    delete: (id: string) => api.delete(`/time-entries/${id}`),
  },

  // Change Log
  changeLog: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return api.get(`/change-log${qs}`);
    },
    create: (data: unknown) => api.post('/change-log', data),
  },

  // Reports
  reports: {
    hoursByEmployee: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return api.get(`/reports/hours-by-employee${qs}`);
    },
    hoursByClient: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return api.get(`/reports/hours-by-client${qs}`);
    },
    hoursByCampaign: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return api.get(`/reports/hours-by-campaign${qs}`);
    },
    myHours: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return api.get(`/reports/my-hours${qs}`);
    },
    clientPortal: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return api.get(`/reports/client-portal${qs}`);
    },
  },

  // Notifications
  notifications: {
    list: () => api.get('/notifications'),
    markRead: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    markAllRead: () => api.patch('/notifications/read-all', {}),
  },

  // Uploads
  uploads: {
    agencyLogo: (file: File) => {
      const fd = new FormData(); fd.append('image', file);
      return api.upload('/uploads/agency-logo', fd);
    },
    clientLogo: (clientId: string, file: File) => {
      const fd = new FormData(); fd.append('image', file);
      return api.upload(`/uploads/client-logo/${clientId}`, fd);
    },
    workerPhoto: (file: File) => {
      const fd = new FormData(); fd.append('image', file);
      return api.upload('/uploads/worker-photo', fd);
    },
  },

  // Settings
  settings: {
    get: () => api.get('/settings'),
    update: (data: unknown) => api.patch('/settings', data),
  },
};

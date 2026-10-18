const RAW_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const API_BASE = RAW_URL.replace(/\/+$/, '');

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    credentials: 'include',
    ...options,
    headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (res.status === 204) {
    return null;
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error?.message || data?.detail || res.statusText || 'Request failed';
    const code = data?.error?.code || 'request_error';
    const error = new Error(message);
    error.status = res.status;
    error.code = code;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  adminLogin: (credentials) =>
    request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, accept_terms: true }),
    }),

  verifyEmail: (token) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  getMe: () => request('/users/me'),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }).catch(() => {}),
};

export const domainsApi = {
  list: () => request('/domains'),
  create: (data) =>
    request('/domains', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  get: (id) => request(`/domains/${id}`),
  delete: (id) =>
    request(`/domains/${id}`, {
      method: 'DELETE',
    }),
  addCompetitor: (domainId, data) =>
    request(`/domains/${domainId}/competitors`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteCompetitor: (domainId, competitorId) =>
    request(`/domains/${domainId}/competitors/${competitorId}`, {
      method: 'DELETE',
    }),
};

export const adminApi = {
  getStats: () => request('/admin/stats'),
  getUsers: () => request('/admin/users'),
  getCustomerDomains: (userId) => request(`/admin/users/${userId}/domains`),
  impersonate: (userId) =>
    request(`/admin/impersonate/${userId}`, {
      method: 'POST',
    }),
};

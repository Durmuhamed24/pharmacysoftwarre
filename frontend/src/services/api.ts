import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharmacy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pharmacy_token');
      localStorage.removeItem('pharmacy_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  users: () => api.get('/auth/users'),
  createUser: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/auth/users', data),
  updateUser: (id: string, data: { role?: string; is_active?: boolean }) =>
    api.patch(`/auth/users/${id}`, data),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, any>) => api.patch('/settings', data),
};

export const medicinesApi = {
  list: (params?: { search?: string; category?: string; stock?: string; expiry?: string }) =>
    api.get('/medicines', { params }),
  get: (id: string) => api.get(`/medicines/${id}`),
  create: (data: any) => api.post('/medicines', data),
  update: (id: string, data: any) => api.patch(`/medicines/${id}`, data),
};

export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data: { name: string; description?: string }) => api.post('/categories', data),
};

export const suppliersApi = {
  list: () => api.get('/suppliers'),
  create: (data: any) => api.post('/suppliers', data),
};

export const customersApi = {
  list: () => api.get('/customers'),
  create: (data: any) => api.post('/customers', data),
};

export const salesApi = {
  list: (params?: { from?: string; to?: string }) => api.get('/sales', { params }),
  create: (data: any) => api.post('/sales', data),
  get: (id: string) => api.get(`/sales/${id}`),
};

export const returnsApi = {
  create: (data: any) => api.post('/returns', data),
};

export const ordersApi = {
  list: () => api.get('/orders'),
  create: (data: any) => api.post('/orders', data),
  update: (id: string, data: { status: string }) => api.patch(`/orders/${id}`, data),
};

export const purchasesApi = {
  list: () => api.get('/purchases'),
  get: (id: string) => api.get(`/purchases/${id}`),
  create: (data: any) => api.post('/purchases', data),
  receive: (id: string, data: { received_items: any[] }) =>
    api.post(`/purchases/${id}/receive`, data),
};

export const expensesApi = {
  list: (params?: { from?: string; to?: string }) => api.get('/expenses', { params }),
  create: (data: any) => api.post('/expenses', data),
};

export const supplierPaymentsApi = {
  create: (data: any) => api.post('/supplier-payments', data),
};

export const stockMovementsApi = {
  list: (params?: { from?: string; to?: string; medicine_id?: string }) =>
    api.get('/stock-movements', { params }),
  adjust: (data: { medicine_batch_id: string; quantity: number; reason: string }) =>
    api.post('/stock-adjustment', data),
};

export const auditApi = {
  list: () => api.get('/audit-logs'),
};

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  sales: (params?: { from?: string; to?: string }) => api.get('/reports/sales', { params }),
  profit: (params?: { from?: string; to?: string }) => api.get('/reports/profit', { params }),
  inventoryValue: () => api.get('/reports/inventory-value'),
  lowStock: () => api.get('/reports/low-stock'),
  expiry: () => api.get('/reports/expiry'),
  expired: () => api.get('/reports/expired'),
  recentActivity: () => api.get('/reports/recent-activity'),
};

export default api;
import apiClient from './client';

export const fetchAllReports = (params = {}) =>
  apiClient.get('/admin/reports', { params }).then((r) => r.data);

/** Triggers a file download for CSV/PDF report export, matching the current filter set. */
export const exportReports = async (params = {}, format = 'csv') => {
  const response = await apiClient.get('/admin/reports/export', {
    params: { ...params, format },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `smartinfra-reports.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const assignReportToStaff = (reportId, staffId) =>
  apiClient.patch(`/admin/reports/${reportId}/assign`, { staffId }).then((r) => r.data);

export const updateReportStatus = (reportId, status) =>
  apiClient.patch(`/admin/reports/${reportId}/status`, { status }).then((r) => r.data);

export const addReportNote = (reportId, note) =>
  apiClient.post(`/admin/reports/${reportId}/notes`, { note }).then((r) => r.data);

export const fetchAnalytics = (params = {}) => apiClient.get('/admin/analytics', { params }).then((r) => r.data);

export const fetchStaffList = () => apiClient.get('/admin/staff').then((r) => r.data.staff);

export const createStaffAccount = (payload) => apiClient.post('/admin/create-staff', payload).then((r) => r.data);

export const deactivateStaffAccount = (userId) => apiClient.patch(`/admin/staff/${userId}/deactivate`).then((r) => r.data);

export const reactivateStaffAccount = (userId) => apiClient.patch(`/admin/staff/${userId}/reactivate`).then((r) => r.data);

export const deleteStaffAccount = (userId) => apiClient.delete(`/admin/staff/${userId}`).then((r) => r.data);

export const updateStaffPermissions = (userId, isSuperAdmin) =>
  apiClient.patch(`/admin/staff/${userId}/permissions`, { isSuperAdmin }).then((r) => r.data);

export const fetchAuditLogs = (params = {}) => apiClient.get('/admin/audit-logs', { params }).then((r) => r.data);

export const exportAuditLogs = async () => {
  const response = await apiClient.get('/admin/audit-logs/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'smartinfra-audit-log.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
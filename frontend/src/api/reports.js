import apiClient from './client';

export const CATEGORY_OPTIONS = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'broken_streetlight', label: 'Broken streetlight' },
  { value: 'water_leak', label: 'Water leak' },
  { value: 'damaged_road', label: 'Damaged road' },
  { value: 'illegal_waste_dumping', label: 'Illegal waste dumping' },
  { value: 'other', label: 'Other' },
];

export const createReport = (formData) =>
  apiClient
    .post('/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);

export const fetchMyReports = (params = {}) =>
  apiClient.get('/reports/mine', { params }).then((r) => r.data.reports);

export const fetchReportById = (id) => apiClient.get(`/reports/${id}`).then((r) => r.data.report);
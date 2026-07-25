import apiClient from './client';

export const fetchMyNotifications = () => apiClient.get('/notifications/mine').then((r) => r.data.notifications);

export const markNotificationRead = (id) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsRead = () => apiClient.patch('/notifications/read-all').then((r) => r.data);
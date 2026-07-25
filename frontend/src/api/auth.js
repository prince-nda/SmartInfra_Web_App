import apiClient from './client';

export const registerUser = (payload) => apiClient.post('/auth/register', payload).then((r) => r.data);

export const loginUser = (payload) => apiClient.post('/auth/login', payload).then((r) => r.data);

export const fetchCurrentUser = () => apiClient.get('/auth/me').then((r) => r.data.user);

export const updateProfile = (payload) => apiClient.patch('/auth/me', payload).then((r) => r.data);

export const verifyOtp = (email, otp) =>
  apiClient.post('/auth/verify-otp', { email, otp }).then((r) => r.data);

export const resendOtp = (email) =>
  apiClient.post('/auth/resend-otp', { email }).then((r) => r.data);

export const forgotPassword = (email) =>
  apiClient.post('/auth/forgot-password', { email }).then((r) => r.data);

export const resetPassword = (email, otp, newPassword) =>
  apiClient.post('/auth/reset-password', { email, otp, newPassword }).then((r) => r.data);

export const changePassword = (currentPassword, newPassword) =>
  apiClient.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data);

export const deleteMyAccount = (password) =>
  apiClient.delete('/auth/me', { data: { password } }).then((r) => r.data);
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api/auth';
import './Auth.css';

export default function ForceChangePassword() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match');
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters');

    setSubmitting(true);
    try {
      const { user: updatedUser } = await changePassword(form.currentPassword, form.newPassword);
      setUser(updatedUser);
      navigate(updatedUser.role === 'admin' ? '/admin/reports' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update your password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <h1>Set a new password</h1>
          <p>
            {user?.full_name ? `Welcome, ${user.full_name}. ` : ''}
            Your account was created with a temporary password. Enter it below along with a new
            password of your own before you can continue.
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="currentPassword">Temporary password</label>
            <input
              id="currentPassword"
              type="password"
              required
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              required
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
            <span className="hint">At least 8 characters</span>
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
            {submitting ? 'Updating…' : 'Set new password and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword, deleteMyAccount } from '../api/auth';
import { RWANDA_DISTRICTS } from '../constants/districts';
import './Dashboard.css';
import './Auth.css';
import './Profile.css';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const isCitizen = user?.role === 'citizen';

  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    phone: user?.phone || '',
    district: user?.district || '',
    nationalIdNo: user?.national_id_no || '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!form.fullName.trim()) return setProfileError('Full name cannot be empty');

    setSavingProfile(true);
    try {
      const payload = { fullName: form.fullName, phone: form.phone };
      if (isCitizen) {
        payload.district = form.district;
        payload.nationalIdNo = form.nationalIdNo;
      }
      const { user: updatedUser } = await updateProfile(payload);
      setUser(updatedUser);
      setProfileSuccess('Profile updated.');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Could not update your profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwError('New passwords do not match');
    if (pwForm.newPassword.length < 8) return setPwError('New password must be at least 8 characters');

    setSavingPassword(true);
    try {
      await changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not change your password.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError('');

    if (!deletePassword) return setDeleteError('Enter your password to confirm');

    setDeleting(true);
    try {
      await deleteMyAccount(deletePassword);
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete your account.');
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Manage your personal details and password.</p>
        </div>
      </div>

      <div className="profile-grid">
        <div className="card profile-section">
          <h2>Personal details</h2>
          <p className="section-hint">Email can't be changed here.</p>

          {profileError && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{profileError}</div>}
          {profileSuccess && <div className="alert alert-success" style={{ marginBottom: 'var(--space-4)' }}>{profileSuccess}</div>}

          <form onSubmit={handleProfileSubmit}>
            <div className="field">
              <label>Email</label>
              <div className="profile-readonly mono">{user.email}</div>
            </div>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone (optional)</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07xxxxxxxx"
              />
              <span className="hint">Used for future SMS notifications</span>
            </div>

            {isCitizen && (
              <>
                <div className="field">
                  <label htmlFor="district">District</label>
                  <select
                    id="district"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                  >
                    <option value="">Select district</option>
                    {RWANDA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="nationalIdNo">National ID</label>
                  <input
                    id="nationalIdNo"
                    value={form.nationalIdNo}
                    onChange={(e) => setForm({ ...form, nationalIdNo: e.target.value })}
                  />
                </div>
              </>
            )}

            {!isCitizen && (user.staff_id || user.department) && (
              <>
                <div className="field">
                  <label>Staff ID</label>
                  <div className="profile-readonly mono">{user.staff_id}</div>
                </div>
                <div className="field">
                  <label>Department</label>
                  <div className="profile-readonly">{user.department}</div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        <div className="card profile-section">
          <h2>Change password</h2>
          <p className="section-hint">You'll need your current password to set a new one.</p>

          {pwError && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{pwError}</div>}
          {pwSuccess && <div className="alert alert-success" style={{ marginBottom: 'var(--space-4)' }}>{pwSuccess}</div>}

          <form onSubmit={handlePasswordSubmit}>
            <div className="field">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                required
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              />
              <span className="hint">At least 8 characters</span>
            </div>
            <div className="field">
              <label htmlFor="confirmNewPassword">Confirm new password</label>
              <input
                id="confirmNewPassword"
                type="password"
                required
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Change password'}
            </button>
          </form>
        </div>

        {isCitizen && (
          <div className="card profile-section" style={{ borderColor: 'var(--color-danger)' }}>
            <h2 style={{ color: 'var(--color-danger)' }}>Delete account</h2>
            <p className="section-hint">
              Permanently deletes your account and all your submitted reports. This cannot be undone.
            </p>

            {!deleteConfirmOpen ? (
              <button className="btn btn-danger" onClick={() => setDeleteConfirmOpen(true)}>
                Delete my account
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount}>
                {deleteError && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{deleteError}</div>}
                <div className="field">
                  <label htmlFor="deletePassword">Confirm your password</label>
                  <input
                    id="deletePassword"
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button type="submit" className="btn btn-danger" disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Permanently delete my account'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setDeleteConfirmOpen(false); setDeletePassword(''); setDeleteError(''); }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
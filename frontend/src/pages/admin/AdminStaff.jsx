import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchStaffList,
  createStaffAccount,
  deactivateStaffAccount,
  reactivateStaffAccount,
  deleteStaffAccount,
  updateStaffPermissions,
} from '../../api/admin';
import '../Dashboard.css';
import '../Auth.css';
import './Admin.css';

export default function AdminStaff() {
  const { user, isSuperAdmin } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', department: '', isSuperAdmin: false });
  const [error, setError] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null); // { fullName, email }
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  function loadStaff() {
    setLoading(true);
    return fetchStaffList().then(setStaff).finally(() => setLoading(false));
  }

  useEffect(() => { loadStaff(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCreatedInfo(null);

    setSubmitting(true);
    try {
      const { user: newUser } = await createStaffAccount(form);
      setCreatedInfo({ fullName: newUser.full_name, email: newUser.email });
      setForm({ fullName: '', email: '', phone: '', department: '', isSuperAdmin: false });
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create staff account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(s) {
    setActioningId(s.user_id);
    try {
      await deactivateStaffAccount(s.user_id);
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not deactivate this administrator.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleReactivate(s) {
    setActioningId(s.user_id);
    try {
      await reactivateStaffAccount(s.user_id);
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reactivate this administrator.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleDelete(s) {
    if (!window.confirm(`Permanently delete ${s.full_name}'s administrator account? This can't be undone.`)) return;
    setActioningId(s.user_id);
    try {
      await deleteStaffAccount(s.user_id);
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this administrator.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleTogglePermission(s) {
    setActioningId(s.user_id);
    try {
      await updateStaffPermissions(s.user_id, !s.is_super_admin);
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update permissions.');
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Staff</h1>
          <p>Manage the administrators who can triage and resolve reports.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      {createdInfo && (
        <div className="alert alert-success" style={{ marginBottom: 'var(--space-6)' }}>
          {createdInfo.fullName} was added. Login credentials were emailed to <strong>{createdInfo.email}</strong> —
          they'll be required to set their own password the first time they log in.
        </div>
      )}

      {isSuperAdmin ? (
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Add staff member</h3>
          <p className="hint" style={{ marginBottom: 'var(--space-4)' }}>
            The system generates a temporary password automatically — the new staff member must change it on first login.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="staff-form-grid">
              <div className="field">
                <label>Full name</label>
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xxxxxxxx" />
              </div>
              <div className="field">
                <label>Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="City of Kigali - Roads" />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-4)' }}>
              <input
                type="checkbox"
                checked={form.isSuperAdmin}
                onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
              />
              Grant super-administrator privileges (can manage other staff accounts)
            </label>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add staff member'}
            </button>
          </form>
        </div>
      ) : (
        <div className="alert" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' }}>
          Only super-administrators can add or manage staff accounts. Contact a super-admin if you need changes made.
        </div>
      )}

      <h3 style={{ marginBottom: 'var(--space-3)' }}>Current staff</h3>
      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : (
        <div className="staff-list">
          {staff.map((s) => (
            <div className="card staff-row" key={s.user_id}>
              <div>
                <span className="staff-name">{s.full_name}</span>
                {s.is_super_admin && <span className="badge badge-in_progress" style={{ marginLeft: 'var(--space-2)' }}>Super-admin</span>}
                {!s.is_active && <span className="badge badge-rejected" style={{ marginLeft: 'var(--space-2)' }}>Deactivated</span>}
                {s.must_change_password && <span className="badge badge-submitted" style={{ marginLeft: 'var(--space-2)' }}>Pending password change</span>}
                <div className="staff-meta">{s.department ? `${s.department} · ` : ''}{s.email}</div>
              </div>

              {isSuperAdmin && s.user_id !== user.user_id && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    className="btn btn-ghost"
                    disabled={actioningId === s.user_id}
                    onClick={() => handleTogglePermission(s)}
                  >
                    {s.is_super_admin ? 'Revoke super-admin' : 'Make super-admin'}
                  </button>
                  {s.is_active ? (
                    <button className="btn btn-secondary" disabled={actioningId === s.user_id} onClick={() => handleDeactivate(s)}>
                      Deactivate
                    </button>
                  ) : (
                    <button className="btn btn-secondary" disabled={actioningId === s.user_id} onClick={() => handleReactivate(s)}>
                      Reactivate
                    </button>
                  )}
                  <button className="btn btn-danger" disabled={actioningId === s.user_id} onClick={() => handleDelete(s)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
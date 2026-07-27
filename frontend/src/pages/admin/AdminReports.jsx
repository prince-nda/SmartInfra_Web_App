import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchAllReports, exportReports, assignReportToStaff, updateReportStatus, fetchStaffList, fetchAnalytics } from '../../api/admin';
import { CATEGORY_OPTIONS } from '../../api/reports';
import CategoryIcon from '../../components/CategoryIcon';
import '../Dashboard.css';
import './Admin.css';

const STATUS_OPTIONS = ['submitted', 'in_progress', 'resolved', 'rejected'];
const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminReports() {
  const { user, isSuperAdmin } = useAuth();
  const [reports, setReports] = useState([]);
  const [staff, setStaff] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', search: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [exporting, setExporting] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // { report, newStatus }
  const [statusMessage, setStatusMessage] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  async function handleExport(format) {
    setExporting(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      await exportReports(params, format);
    } finally {
      setExporting(false);
    }
  }

  function loadReports() {
    setLoading(true);
    const params = { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page };
    return fetchAllReports(params)
      .then((data) => {
        setReports(data.reports);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchStaffList().then(setStaff);
    fetchAnalytics().then(setSummary);
  }, []);

  // Any filter change resets to page 1
  useEffect(() => {
    setPage(1);
     
  }, [filters]);

  useEffect(() => {
    const timeout = setTimeout(loadReports, 300); // debounce free-text search
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  function handleStatusChange(report, status) {
    setStatusMessage('');
    setPendingStatusChange({ report, newStatus: status });
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange) return;
    const { report, newStatus } = pendingStatusChange;
    setSavingStatus(true);
    try {
      await updateReportStatus(report.report_id, newStatus, statusMessage.trim() || undefined);
      setReports((prev) => prev.map((r) => (r.report_id === report.report_id ? { ...r, status: newStatus } : r)));
      setPendingStatusChange(null);
      setStatusMessage('');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleAssignChange(report, staffId) {
    setReports((prev) => prev.map((r) => (r.report_id === report.report_id ? { ...r, assigned_staff_id: staffId } : r)));
    if (staffId) await assignReportToStaff(report.report_id, staffId);
  }

  return (
    <div className="container page">
      <div className="dashboard-welcome">
        <h1>{getGreeting()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}.</h1>
        <p>Here's the current state of every report in the system.</p>
      </div>

      {summary && (
        <div className="stat-strip" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card stat-strip-item">
            <div className="stat-strip-value">{summary.totals.total}</div>
            <div className="stat-strip-label">Total reports</div>
          </div>
          <div className="card stat-strip-item">
            <div className="stat-strip-value" style={{ color: 'var(--color-signal-submitted)' }}>{summary.totals.pending}</div>
            <div className="stat-strip-label">Pending</div>
          </div>
          <div className="card stat-strip-item">
            <div className="stat-strip-value" style={{ color: 'var(--color-signal-resolved)' }}>{summary.totals.resolved}</div>
            <div className="stat-strip-label">Resolved</div>
          </div>
          <div className="card stat-strip-item">
            <div className="stat-strip-value" style={{ color: 'var(--color-signal-progress)' }}>{summary.averageResolutionDays ? `${summary.averageResolutionDays}d` : '—'}</div>
            <div className="stat-strip-label">Avg. resolution</div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 'var(--fs-lg)' }}>All reports</h1>
          <p>Search, filter, assign, and update status across every citizen report.</p>
        </div>
        {!loading && pagination.total > 0 && (
          <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-faint)' }}>
            {pagination.total} total
          </span>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={() => handleExport('csv')} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport('pdf')} disabled={exporting}>
            Export PDF
          </button>
        </div>
      </div>

      <div className="admin-filter-bar">
        <input
          type="text"
          placeholder="Search description or location…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
        <span style={{ color: 'var(--color-ink-faint)', fontSize: 'var(--fs-xs)' }}>to</span>
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
      </div>

      {loading ? (
        <div className="page-loading">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="page-empty card" style={{ padding: 'var(--space-7)' }}>No reports match these filters.</div>
      ) : (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>ID</th>
                <th>Category</th>
                <th>Citizen</th>
                <th>Description</th>
                <th>Location</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Assigned to</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.report_id}>
                  <td><span className="admin-table-icon"><CategoryIcon category={r.category} /></span></td>
                  <td className="mono">#{r.report_id}</td>
                  <td>{CATEGORY_LABELS[r.category] || r.category}</td>
                  <td>
                    <div>{r.citizen_name}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-faint)' }}>{r.citizen_email}</div>
                  </td>
                  <td className="admin-table-desc" title={r.description}>{r.description}</td>
                  <td className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-muted)' }}>
                    {r.location_text || (r.gps_lat ? `${Number(r.gps_lat).toFixed(5)}, ${Number(r.gps_long).toFixed(5)}` : '—')}
                  </td>
                  <td className="mono">{new Date(r.date_submitted).toLocaleDateString()}</td>
                  <td>
                    <select value={r.status} onChange={(e) => handleStatusChange(r, e.target.value)}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td>
                    {isSuperAdmin ? (
                      <select value={r.assigned_staff_id || ''} onChange={(e) => handleAssignChange(r, e.target.value)}>
                        <option value="">Unassigned</option>
                        {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 'var(--fs-sm)', color: r.assigned_staff_name ? 'var(--color-ink)' : 'var(--color-ink-faint)' }}>
                        {r.assigned_staff_name || 'Unassigned'}
                      </span>
                    )}
                  </td>
                  <td><Link to={`/reports/${r.report_id}`} className="admin-table-link">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className="mono">Page {pagination.page} of {pagination.totalPages}</span>
              <button
                className="btn btn-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {pendingStatusChange && (
        <div className="modal-overlay" onClick={() => setPendingStatusChange(null)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>
              Update report #{pendingStatusChange.report.report_id} to "{pendingStatusChange.newStatus.replace('_', ' ')}"
            </h3>
            <p className="hint" style={{ marginBottom: 'var(--space-3)' }}>
              Add an optional message for the citizen — it'll be included in their notification and email.
            </p>
            <div className="field">
              <textarea
                rows={3}
                placeholder="e.g. Repair crew scheduled for Thursday morning."
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setPendingStatusChange(null)} disabled={savingStatus}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmStatusChange} disabled={savingStatus}>
                {savingStatus ? 'Updating…' : 'Confirm update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
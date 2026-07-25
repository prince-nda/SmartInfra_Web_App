import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllReports, exportReports, assignReportToStaff, updateReportStatus, fetchStaffList } from '../../api/admin';
import { CATEGORY_OPTIONS } from '../../api/reports';
import CategoryIcon from '../../components/CategoryIcon';
import StatusBadge from '../../components/StatusBadge';
import '../Dashboard.css';
import './Admin.css';

const STATUS_OPTIONS = ['submitted', 'in_progress', 'resolved', 'rejected'];
const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', search: '', dateFrom: '', dateTo: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [exporting, setExporting] = useState(false);

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
  }, []);

  // Any filter change resets to page 1
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const timeout = setTimeout(loadReports, 300); // debounce free-text search
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  async function handleStatusChange(report, status) {
    setReports((prev) => prev.map((r) => (r.report_id === report.report_id ? { ...r, status } : r)));
    await updateReportStatus(report.report_id, status);
  }

  async function handleAssignChange(report, staffId) {
    setReports((prev) => prev.map((r) => (r.report_id === report.report_id ? { ...r, assigned_staff_id: staffId } : r)));
    if (staffId) await assignReportToStaff(report.report_id, staffId);
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>All reports</h1>
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
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-muted)' }}>{r.location_text || '—'}</td>
                  <td className="mono">{new Date(r.date_submitted).toLocaleDateString()}</td>
                  <td>
                    <select value={r.status} onChange={(e) => handleStatusChange(r, e.target.value)}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={r.assigned_staff_id || ''} onChange={(e) => handleAssignChange(r, e.target.value)}>
                      <option value="">Unassigned</option>
                      {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
                    </select>
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
    </div>
  );
}
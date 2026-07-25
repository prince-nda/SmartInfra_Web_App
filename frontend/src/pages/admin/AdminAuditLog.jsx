import { useEffect, useState } from 'react';
import { fetchAuditLogs, exportAuditLogs } from '../../api/admin';
import '../Dashboard.css';
import './Admin.css';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAuditLogs({ page })
      .then((data) => {
        setLogs(data.logs);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  }, [page]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportAuditLogs();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Audit log</h1>
          <p>Every administrator action, retained for compliance review.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="page-empty card" style={{ padding: 'var(--space-7)' }}>No actions recorded yet.</div>
      ) : (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id}>
                  <td className="mono">{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user_name || `User #${log.user_id ?? 'unknown'}`}</td>
                  <td className="mono">{log.action}</td>
                  <td className="mono">{log.entity_type ? `${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ''}` : '—'}</td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-faint)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details ? JSON.stringify(log.details) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ← Previous
              </button>
              <span className="mono">Page {pagination.page} of {pagination.totalPages}</span>
              <button className="btn btn-secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
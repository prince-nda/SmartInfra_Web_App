import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyReports, CATEGORY_OPTIONS } from '../api/reports';
import CategoryIcon from '../components/CategoryIcon';
import StatusBadge from '../components/StatusBadge';
import './Dashboard.css';

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (category) params.category = category;
    fetchMyReports(params)
      .then(setReports)
      .finally(() => setLoading(false));
  }, [status, category]);

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>My reports</h1>
          <p>Everything you've submitted, and where it stands.</p>
        </div>
        <Link to="/reports/new" className="btn btn-primary">+ New report</Link>
      </div>

      <div className="filter-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="page-loading">Loading your reports…</div>
      ) : reports.length === 0 ? (
        <div className="page-empty card" style={{ padding: 'var(--space-7)' }}>
          <p>No reports match yet. Spotted a pothole or a broken streetlight?</p>
          <Link to="/reports/new" className="btn btn-primary" style={{ marginTop: 'var(--space-4)', display: 'inline-flex' }}>
            Submit your first report
          </Link>
        </div>
      ) : (
        <div className="report-grid">
          {reports.map((r) => (
            <Link to={`/reports/${r.report_id}`} key={r.report_id} className="card report-card">
              <div className="report-card-top">
                <span className="report-card-icon"><CategoryIcon category={r.category} /></span>
                <StatusBadge status={r.status} />
              </div>
              <p className="report-card-desc">{r.description}</p>
              <div className="report-card-meta">
                <span>#{r.report_id}</span>
                <span>{new Date(r.date_submitted).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

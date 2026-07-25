import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchReportById, CATEGORY_OPTIONS } from '../api/reports';
import { addReportNote } from '../api/admin';
import CategoryIcon from '../components/CategoryIcon';
import StatusBadge from '../components/StatusBadge';
import './Dashboard.css';
import './ReportDetail.css';

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));

export default function ReportDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [noteText, setNoteText] = useState('');
  const [noteError, setNoteError] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  function loadReport() {
    return fetchReportById(id).then(setReport);
  }

  useEffect(() => {
    setLoading(true);
    loadReport()
      .catch((err) => setError(err.response?.data?.message || 'Could not load this report.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddNote(e) {
    e.preventDefault();
    setNoteError('');
    if (!noteText.trim()) return setNoteError('Enter a note before saving');

    setAddingNote(true);
    try {
      await addReportNote(id, noteText.trim());
      setNoteText('');
      await loadReport();
    } catch (err) {
      setNoteError(err.response?.data?.message || 'Could not add note.');
    } finally {
      setAddingNote(false);
    }
  }

  if (loading) return <div className="container page-loading">Loading report…</div>;
  if (error) return <div className="container page"><div className="alert alert-error">{error}</div></div>;
  if (!report) return null;

  const events = [
    { label: 'Report submitted', date: report.date_submitted },
    ...(report.status === 'in_progress' ? [{ label: 'Marked in progress', date: report.updated_at }] : []),
    ...(report.status === 'rejected' ? [{ label: 'Report rejected', date: report.updated_at }] : []),
    ...(report.resolved_at ? [{ label: 'Marked resolved', date: report.resolved_at }] : []),
  ];

  return (
    <div className="container page" style={{ maxWidth: 880 }}>
      <Link to={isAdmin ? '/admin/reports' : '/dashboard'} className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: 'var(--space-4)' }}>
        ← Back to {isAdmin ? 'all reports' : 'my reports'}
      </Link>

      <div className="report-detail-header">
        <span className="report-detail-icon"><CategoryIcon category={report.category} /></span>
        <div>
          <h1 style={{ fontSize: 'var(--fs-lg)' }}>{CATEGORY_LABELS[report.category] || report.category}</h1>
          <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-faint)' }}>Report #{report.report_id}</span>
        </div>
        <div style={{ marginLeft: 'auto' }}><StatusBadge status={report.status} /></div>
      </div>

      <div className="report-detail-grid">
        <div>
          <div className="card detail-section">
            <h3>Description</h3>
            <p style={{ fontSize: 'var(--fs-base)' }}>{report.description}</p>
          </div>

          {report.images?.length > 0 && (
            <div className="card detail-section">
              <h3>Photos</h3>
              <div className="report-images-grid">
                {report.images.map((img) => (
                  <a key={img.image_id} href={img.file_url} target="_blank" rel="noreferrer">
                    <img src={img.file_url} alt="Reported issue" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="card detail-section">
            <h3>Timeline</h3>
            <ul className="timeline">
              {events.map((ev, i) => (
                <li key={i}>
                  <span className="timeline-dot" />
                  <div className="timeline-body">
                    <p>{ev.label}</p>
                    <span>{new Date(ev.date).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {isAdmin && (
            <div className="card detail-section">
              <h3>Internal notes</h3>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-ink-faint)', marginBottom: 'var(--space-3)' }}>
                Visible to administrators only - never shown to the citizen.
              </p>

              {noteError && <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>{noteError}</div>}

              <form onSubmit={handleAddNote} style={{ marginBottom: 'var(--space-4)' }}>
                <div className="field">
                  <textarea
                    rows={3}
                    placeholder="Document an action taken on this report…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" disabled={addingNote}>
                  {addingNote ? 'Saving…' : 'Add note'}
                </button>
              </form>

              {report.notes?.length > 0 ? (
                <ul className="timeline">
                  {report.notes.map((n) => (
                    <li key={n.note_id}>
                      <span className="timeline-dot" />
                      <div className="timeline-body">
                        <p>{n.note}</p>
                        <span>{n.admin_name || 'Admin'} · {new Date(n.created_at).toLocaleString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-ink-faint)' }}>No notes yet.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="card detail-section">
            <h3>Details</h3>
            <div className="detail-row"><span>Status</span><span><StatusBadge status={report.status} /></span></div>
            {report.location_text && <div className="detail-row"><span>Location</span><span>{report.location_text}</span></div>}
            {report.gps_lat && (
              <div className="detail-row">
                <span>Coordinates</span>
                <span>{Number(report.gps_lat).toFixed(5)}, {Number(report.gps_long).toFixed(5)}</span>
              </div>
            )}
            <div className="detail-row"><span>Submitted</span><span>{new Date(report.date_submitted).toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
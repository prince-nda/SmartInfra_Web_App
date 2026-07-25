import { useCallback, useEffect, useState } from 'react';
import { fetchAnalytics } from '../../api/admin';
import { CATEGORY_OPTIONS } from '../../api/reports';
import ThemedChart from '../../components/ThemedChart';
import '../Dashboard.css';
import './Admin.css';

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.map((c) => [c.value, c.label]));
const STATUS_LABELS = { submitted: 'Submitted', in_progress: 'In progress', resolved: 'Resolved', rejected: 'Rejected' };

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  const buildStatusChart = useCallback((colors) => {
    const statusColorMap = {
      submitted: colors.submitted,
      in_progress: colors.progress,
      resolved: colors.resolved,
      rejected: colors.rejected,
    };
    const rows = data?.byStatus || [];
    return {
      type: 'doughnut',
      data: {
        labels: rows.map((r) => STATUS_LABELS[r.status] || r.status),
        datasets: [{
          data: rows.map((r) => r.count),
          backgroundColor: rows.map((r) => statusColorMap[r.status] || colors.accent),
          borderWidth: 0,
        }],
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { color: colors.ink, font: { family: colors.fontBody } } } },
        cutout: '65%',
      },
    };
  }, [data]);

  const buildCategoryChart = useCallback((colors) => {
    const rows = data?.byCategory || [];
    return {
      type: 'bar',
      data: {
        labels: rows.map((r) => CATEGORY_LABELS[r.category] || r.category),
        datasets: [{
          data: rows.map((r) => r.count),
          backgroundColor: colors.accent,
          borderRadius: 4,
          maxBarThickness: 32,
        }],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: colors.inkMuted, font: { family: colors.fontMono } }, grid: { color: colors.line } },
          y: { ticks: { color: colors.ink, font: { family: colors.fontBody } }, grid: { display: false } },
        },
      },
    };
  }, [data]);

  const buildDistrictChart = useCallback((colors) => {
    const rows = (data?.byDistrict || []).slice(0, 8);
    return {
      type: 'bar',
      data: {
        labels: rows.map((r) => r.district),
        datasets: [{
          data: rows.map((r) => r.count),
          backgroundColor: colors.progress,
          borderRadius: 4,
          maxBarThickness: 28,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: colors.ink, font: { family: colors.fontBody } }, grid: { display: false } },
          y: { ticks: { color: colors.inkMuted, font: { family: colors.fontMono } }, grid: { color: colors.line } },
        },
      },
    };
  }, [data]);

  if (loading) return <div className="container page-loading">Loading analytics…</div>;
  if (!data) return null;

  return (
    <div className="container page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>How reports break down by type, status, district, and resolution time.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">Total reports</div>
          <div className="stat-value">{data.totals.total}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Resolved</div>
          <div className="stat-value">{data.totals.resolved}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{data.totals.pending}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Avg. resolution time</div>
          <div className="stat-value">{data.averageResolutionDays ? `${data.averageResolutionDays}d` : '—'}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3>By status</h3>
          <ThemedChart buildConfig={buildStatusChart} />
        </div>
        <div className="card chart-card">
          <h3>By category</h3>
          <ThemedChart buildConfig={buildCategoryChart} />
        </div>
        <div className="card chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3>By district</h3>
          <ThemedChart buildConfig={buildDistrictChart} />
        </div>
      </div>
    </div>
  );
}
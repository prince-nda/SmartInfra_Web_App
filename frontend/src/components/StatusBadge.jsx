const LABELS = {
  submitted: 'Submitted',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] || status}</span>;
}

/**
 * CategoryIcon — the app's signature visual motif.
 * Each icon is drawn as a single-weight technical line mark, like a
 * legend symbol on a municipal survey map, rather than a filled
 * illustrative icon. They render identically in report cards, the
 * new-report category picker, and status badges so a citizen learns
 * to recognize "pothole" or "water leak" as a shape, not just a word.
 */
const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const ICONS = {
  pothole: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path {...strokeProps} d="M3 16c2-1 3-3 5-3s2 2 4 2 3-3 5-3 2 2 4 1" />
      <ellipse {...strokeProps} cx="12" cy="14" rx="7" ry="3" />
      <path {...strokeProps} d="M5 14v3M19 14v3" />
    </svg>
  ),
  broken_streetlight: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path {...strokeProps} d="M11 21V11" />
      <path {...strokeProps} d="M8 21h6" />
      <path {...strokeProps} d="M9 11l2-4-3-1 5-5-1 5 3 1-3 5" />
      <path {...strokeProps} d="M4 4l2 2M20 4l-2 2" strokeDasharray="1 3" />
    </svg>
  ),
  water_leak: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path {...strokeProps} d="M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z" />
      <path {...strokeProps} d="M4 20c1.5-1 3-1 4 0s2.5 1 4 0 2.5-1 4 0 2.5 1 4 0" />
    </svg>
  ),
  damaged_road: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path {...strokeProps} d="M2 20l7-16h2l-2 7h3l-2 9" />
      <path {...strokeProps} d="M13 20l4-16h2l3 16" />
      <path {...strokeProps} d="M11 11h3" />
    </svg>
  ),
  illegal_waste_dumping: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path {...strokeProps} d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z" />
      <path {...strokeProps} d="M3 8h18M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path {...strokeProps} d="M10 11v6M14 11v6" />
    </svg>
  ),
  other: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <circle {...strokeProps} cx="12" cy="12" r="9" />
      <path {...strokeProps} d="M12 16v.01M12 8a2.5 2.5 0 0 1 2.5 2.5c0 1.5-2.5 1.8-2.5 3.5" />
    </svg>
  ),
};

export default function CategoryIcon({ category, className }) {
  const Icon = ICONS[category] || ICONS.other;
  return <Icon className={className} />;
}

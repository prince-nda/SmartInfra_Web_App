import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders the human-readable label for a known status', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('applies a status-specific class name for styling', () => {
    render(<StatusBadge status="resolved" />);
    expect(screen.getByText('Resolved')).toHaveClass('badge-resolved');
  });

  it.each([
    ['submitted', 'Submitted'],
    ['in_progress', 'In progress'],
    ['resolved', 'Resolved'],
    ['rejected', 'Rejected'],
  ])('maps %s to "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to the raw status string for an unrecognized status', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });
});
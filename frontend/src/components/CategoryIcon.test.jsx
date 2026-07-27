import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CategoryIcon from '../components/CategoryIcon';

const KNOWN_CATEGORIES = ['pothole', 'broken_streetlight', 'water_leak', 'damaged_road', 'illegal_waste_dumping', 'other'];

describe('CategoryIcon', () => {
  it.each(KNOWN_CATEGORIES)('renders an SVG for the "%s" category', (category) => {
    const { container } = render(<CategoryIcon category={category} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('falls back to the "other" icon for an unrecognized category rather than crashing', () => {
    const { container } = render(<CategoryIcon category="something_made_up" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('passes className through to the rendered icon', () => {
    const { container } = render(<CategoryIcon category="pothole" className="my-icon-class" />);
    expect(container.querySelector('svg')).toHaveClass('my-icon-class');
  });
});
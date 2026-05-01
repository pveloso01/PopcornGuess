import { render, screen, within } from '@testing-library/react';
import StreakDistribution from './StreakDistribution';

describe('StreakDistribution', () => {
  it('renders 7 rows (1..6 and X)', () => {
    render(<StreakDistribution histogram={[2, 1, 0, 0, 0, 0, 1]} />);
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
    // "X" is unique to the failure bucket label.
    expect(within(list).getByText('X')).toBeInTheDocument();
  });

  it('marks the highlighted row with aria-current', () => {
    render(
      <StreakDistribution
        histogram={[1, 1, 1, 0, 0, 0, 0]}
        highlightIndex={2}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items[2]).toHaveAttribute('aria-current', 'true');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });

  it('renders zero-counts as bars with min width', () => {
    render(<StreakDistribution histogram={[0, 0, 0, 0, 0, 0, 0]} />);
    // All 7 bars rendered as separate <div>s — using listitem rows.
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });

  it('exposes the section accessible name "Guess distribution"', () => {
    render(<StreakDistribution histogram={[1, 0, 0, 0, 0, 0, 0]} />);
    expect(screen.getByLabelText('Guess distribution')).toBeInTheDocument();
  });
});

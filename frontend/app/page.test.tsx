import { render, screen } from '@testing-library/react';
import Home from './page';

// Mock Next.js navigation hooks used by sub-components.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Home page', () => {
  it('renders the How to Play heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /how to play/i })).toBeInTheDocument();
  });

  it('explains the daily-quiz cadence in the CTA section', () => {
    render(<Home />);
    expect(screen.getByText(/daily quiz resets at midnight utc/i)).toBeInTheDocument();
  });

  it('exposes a primary action linking into the quiz flow', () => {
    render(<Home />);
    const cta = screen.getByRole('link', { name: /start playing now/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', expect.stringMatching(/^\/quiz/));
  });

  it('shows the three-step onboarding (start, guess, share)', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /start the quiz/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /guess the answer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /share & compete/i })).toBeInTheDocument();
  });
});

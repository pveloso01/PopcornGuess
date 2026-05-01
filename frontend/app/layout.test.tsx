import RootLayout, { metadata, viewport } from './layout';

jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans', subsets: ['latin'] }),
  Geist_Mono: () => ({ variable: '--font-geist-mono', subsets: ['latin'] }),
}));

jest.mock('./globals.css', () => ({}));

jest.mock('@/components/Navbar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/Footer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/hooks/useStreak', () => ({
  useStreak: () => ({ currentStreak: 0 }),
}));

describe('RootLayout', () => {
  it('renders an html element with lang="en"', () => {
    const result = RootLayout({ children: null });
    expect(result.type).toBe('html');
    expect(result.props.lang).toBe('en');
  });

  it('applies the font variables and antialiased class to body', () => {
    const result = RootLayout({ children: null });
    const body = result.props.children;
    expect(body.type).toBe('body');
    expect(body.props.className).toContain('--font-geist-sans');
    expect(body.props.className).toContain('--font-geist-mono');
    expect(body.props.className).toContain('antialiased');
  });

  it('exposes branded metadata defaults', () => {
    expect(metadata.applicationName).toBe('PopcornGuess');
    expect(metadata.description).toMatch(/daily movie/i);
    expect(metadata.openGraph?.type).toBe('website');
    expect(metadata.twitter?.card).toBe('summary_large_image');
  });

  it('configures a sensible mobile viewport', () => {
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
  });
});

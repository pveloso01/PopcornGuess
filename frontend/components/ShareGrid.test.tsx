import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareGrid from './ShareGrid';

describe('ShareGrid', () => {
  const baseProps = {
    date: '2026-05-01',
    solved: true,
    rungsRevealed: 3,
    attempts: [
      { isCorrect: false, rungsSeen: 1 },
      { isCorrect: false, rungsSeen: 2 },
      { isCorrect: true, rungsSeen: 3 },
    ],
    siteUrl: 'https://test.example',
  };

  let writeTextSpy: jest.Mock;

  beforeEach(() => {
    writeTextSpy = jest.fn().mockResolvedValue(undefined);
    // Some jsdom builds expose navigator.clipboard as a non-configurable
    // getter; using defineProperty with value works whether or not it's
    // already defined.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText: writeTextSpy },
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    // Some browsers fall back to document.execCommand('copy'); stub it
    // so the fallback path can still complete in jsdom.
    document.execCommand = jest.fn().mockReturnValue(true);
  });

  it('renders the share text body with score and grid', () => {
    render(<ShareGrid {...baseProps} />);
    expect(screen.getByLabelText('Shareable result grid')).toHaveTextContent(
      '3/6'
    );
    expect(screen.getByLabelText('Shareable result grid')).toHaveTextContent(
      '⬛⬛🟩'
    );
  });

  it('shows a caption when provided', () => {
    render(<ShareGrid {...baseProps} caption="Today's result" />);
    expect(screen.getByText("Today's result")).toBeInTheDocument();
  });

  it('does not render a Share button when navigator.share is missing', () => {
    render(<ShareGrid {...baseProps} />);
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('renders Share button when navigator.share exists', () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });
    render(<ShareGrid {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  it('copies on click and toggles label to Copied ✓', async () => {
    const user = userEvent.setup();
    render(<ShareGrid {...baseProps} />);
    const button = screen.getByRole('button', { name: 'Copy result' });
    await user.click(button);
    // Either the clipboard API or the execCommand fallback succeeded —
    // we don't care which path won, only that the UI updated.
    expect(
      await screen.findByRole('button', { name: 'Copied ✓' })
    ).toBeInTheDocument();
  });

  it('uses window.location.origin as the default siteUrl', () => {
    const { siteUrl: _omitted, ...propsWithoutSite } = baseProps;
    void _omitted;
    render(<ShareGrid {...propsWithoutSite} />);
    // jsdom defaults to http://localhost — that or the hard fallback must appear.
    const text = screen.getByLabelText('Shareable result grid').textContent ?? '';
    expect(
      text.includes('http://localhost') ||
        text.includes('https://popcornguess.com')
    ).toBe(true);
  });

  it('hides the h3 when no caption is provided', () => {
    render(<ShareGrid {...baseProps} />);
    // Without caption, no h3 heading rendered.
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('honours the siteUrl prop in the share text body', () => {
    render(<ShareGrid {...baseProps} siteUrl="https://custom.test/path" />);
    expect(screen.getByLabelText('Shareable result grid')).toHaveTextContent(
      'https://custom.test/path'
    );
  });

  it('falls back to copy when native share is rejected (user cancel)', async () => {
    // nativeShare returns false on rejection; ShareGrid then invokes handleCopy.
    const shareMock = jest.fn().mockRejectedValue(new Error('cancelled'));
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      writable: true,
      value: shareMock,
    });
    const { waitFor: rtlWaitFor, act: rtlAct } = await import(
      '@testing-library/react'
    );
    render(<ShareGrid {...baseProps} />);
    const shareBtn = screen.getByRole('button', { name: 'Share' });
    await rtlAct(async () => {
      shareBtn.click();
      // Flush several microtask ticks so:
      // 1) navigator.share rejects → nativeShare resolves false
      // 2) handleCopy runs and awaits navigator.clipboard.writeText
      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
      }
    });
    expect(shareMock).toHaveBeenCalled();
    await rtlWaitFor(() => {
      const writeCalled = writeTextSpy.mock.calls.length > 0;
      const execCalled =
        (document.execCommand as jest.Mock).mock.calls.length > 0;
      expect(writeCalled || execCalled).toBe(true);
    });
  });


  it('exposes Twitter and WhatsApp deep links with encoded text', () => {
    render(<ShareGrid {...baseProps} />);
    const tw = screen.getByRole('link', { name: 'Share on X' });
    expect(tw).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/twitter\.com\/intent\/tweet\?text=/)
    );
    const wa = screen.getByRole('link', { name: 'WhatsApp' });
    expect(wa).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/wa\.me\/\?text=/)
    );
  });
});

'use client';

import { useState } from 'react';
import {
  copyToClipboard,
  generateLadderShareText,
  isNativeShareSupported,
  nativeShare,
  type LadderShareInput,
} from '@/lib/shareFormat';

interface ShareGridProps extends LadderShareInput {
  /** Title shown above the grid (won't be included in shared text). */
  caption?: string;
}

/**
 * Wordle-style spoiler-free share card for synopsis-ladder mode.
 *
 * Renders the grid visibly (so the player can preview what they'll share)
 * and exposes Copy + Native Share + Twitter + WhatsApp.
 */
export default function ShareGrid(props: ShareGridProps): React.JSX.Element {
  const {
    caption,
    siteUrl = (typeof window !== 'undefined' && window.location?.origin) ||
      'https://popcornguess.com',
    ...rest
  } = props;

  const shareText = generateLadderShareText({ ...rest, siteUrl });
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(shareText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    const ok = await nativeShare('PopcornGuess', shareText, siteUrl);
    if (!ok) {
      // User cancelled or unsupported — fall back to copy.
      handleCopy();
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-6">
      {caption && (
        <h3 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">
          {caption}
        </h3>
      )}

      <pre
        aria-label="Shareable result grid"
        className="font-mono whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)] mb-4"
      >
        {shareText}
      </pre>

      <div className="flex flex-wrap gap-2">
        {isNativeShareSupported() ? (
          <button
            type="button"
            onClick={handleNativeShare}
            className="px-4 py-2 rounded-lg bg-gradient-amber text-[var(--background)] font-semibold hover:opacity-90"
          >
            Share
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--background)]"
        >
          {copied ? 'Copied ✓' : 'Copy result'}
        </button>

        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--background)]"
        >
          Share on X
        </a>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--background)]"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}

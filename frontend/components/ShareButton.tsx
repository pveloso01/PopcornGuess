'use client';

import { useState } from 'react';
import {
  generateShareText,
  copyToClipboard,
  nativeShare,
  isNativeShareSupported,
  getTwitterShareUrl,
  getWhatsAppShareUrl,
  getScoreBadge,
} from '@/lib/shareFormat';

/**
 * ShareButton Component
 *
 * Provides multiple sharing options:
 * - Native share (mobile)
 * - Copy to clipboard
 * - Twitter
 * - WhatsApp
 */

interface ShareButtonProps {
  result: {
    quizId: string;
    date: string;
    score: number;
    totalQuestions: number;
    answers: Array<{
      isCorrect: boolean;
      attemptsUsed: number;
    }>;
    streak?: number;
  };
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function ShareButton({
  result,
  variant = 'primary',
  size = 'md',
}: ShareButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = generateShareText(result);
  const badge = getScoreBadge(result.score, result.totalQuestions);
  const hasNativeShare = isNativeShareSupported();

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-[var(--gold)] text-[var(--background)] hover:bg-[var(--gold-light)]',
    secondary:
      'border-2 border-[var(--border-light)] text-[var(--text-primary)] hover:border-[var(--gold)] hover:text-[var(--gold)]',
  };

  const handleNativeShare = async () => {
    const success = await nativeShare(
      'PopcornGuess Results',
      shareText,
      'https://popcornguess.com'
    );

    if (!success) {
      // Fallback to copy
      handleCopy();
    }

    setShowDropdown(false);
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowDropdown(false);
  };

  const handleTwitterShare = () => {
    const url = getTwitterShareUrl(shareText);
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowDropdown(false);
  };

  const handleWhatsAppShare = () => {
    const url = getWhatsAppShareUrl(shareText);
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowDropdown(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => (hasNativeShare ? handleNativeShare() : setShowDropdown(!showDropdown))}
        className={`inline-flex items-center gap-2 font-semibold rounded-full transition-colors
                    ${sizeClasses[size]} ${variantClasses[variant]}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {copied ? 'Copied!' : 'Share Results'}
        <span>{badge.emoji}</span>
      </button>

      {/* Dropdown menu for non-native share */}
      {showDropdown && !hasNativeShare && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 mt-2 right-0 w-48 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl animate-scale-in">
            <button
              onClick={handleCopy}
              className="w-full px-4 py-3 text-left text-[var(--text-primary)] hover:bg-[var(--background-tertiary)] transition-colors flex items-center gap-3"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy to Clipboard
            </button>

            <button
              onClick={handleTwitterShare}
              className="w-full px-4 py-3 text-left text-[var(--text-primary)] hover:bg-[var(--background-tertiary)] transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on Twitter
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="w-full px-4 py-3 text-left text-[var(--text-primary)] hover:bg-[var(--background-tertiary)] transition-colors flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share on WhatsApp
            </button>
          </div>
        </>
      )}
    </div>
  );
}


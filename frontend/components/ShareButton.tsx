'use client';

/**
 * ShareButton Component
 *
 * Handles sharing quiz results to social media
 * - Twitter
 * - Facebook
 * - WhatsApp
 * - Copy to clipboard
 * - Native share (mobile)
 */

import { useState } from 'react';
import {
  copyToClipboard,
  nativeShare,
  isNativeShareSupported,
  getTwitterShareUrl,
  getWhatsAppShareUrl,
} from '@/lib/shareFormat';

interface ShareButtonProps {
  shareText: string;
  quizTitle: string;
}

export default function ShareButton({ shareText, quizTitle }: ShareButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    const success = await nativeShare(quizTitle, shareText, 'https://popcornguess.com');
    if (!success) {
      setShowOptions(true);
    }
  };

  const handleShare = () => {
    if (isNativeShareSupported()) {
      handleNativeShare();
    } else {
      setShowOptions(!showOptions);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="w-full py-4 px-6 bg-gradient-amber text-[var(--background)] font-bold rounded-lg hover:opacity-90 transition-opacity"
      >
        Share Results 📤
      </button>

      {showOptions && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-[var(--background)] border border-[var(--background-secondary)] rounded-lg shadow-lg overflow-hidden z-10">
          <button
            onClick={() => {
              window.open(getTwitterShareUrl(shareText), '_blank');
              setShowOptions(false);
            }}
            className="w-full px-4 py-3 hover:bg-[var(--background-secondary)] transition-colors text-left flex items-center gap-3"
          >
            <span>🐦</span>
            <span>Share on Twitter</span>
          </button>

          <button
            onClick={() => {
              window.open(getWhatsAppShareUrl(shareText), '_blank');
              setShowOptions(false);
            }}
            className="w-full px-4 py-3 hover:bg-[var(--background-secondary)] transition-colors text-left flex items-center gap-3"
          >
            <span>💬</span>
            <span>Share on WhatsApp</span>
          </button>

          <button
            onClick={() => {
              handleCopy();
              setShowOptions(false);
            }}
            className="w-full px-4 py-3 hover:bg-[var(--background-secondary)] transition-colors text-left flex items-center gap-3"
          >
            <span>{copySuccess ? '✅' : '📋'}</span>
            <span>{copySuccess ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

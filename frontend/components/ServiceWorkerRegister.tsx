'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker once, after first paint.
 *
 * No-ops in development so Next's HMR isn't poisoned by an aggressive
 * cache. To exercise locally, run `npm run build && npm start`.
 */
export default function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          /* swallow — SW failures shouldn't break the page */
        });
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}

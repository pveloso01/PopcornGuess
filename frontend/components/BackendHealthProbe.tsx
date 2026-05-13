'use client';

import { useEffect, useState } from 'react';

/**
 * Probes the backend's /health/ endpoint on first mount and surfaces a
 * banner if the backend is unreachable.
 *
 * Why: previously a misconfigured NEXT_PUBLIC_API_URL surfaced only as a
 * generic "Failed to fetch" inside the daily-quiz fetch — by the time
 * the user saw it, they didn't know whether the API was down, their
 * connection was down, or the deploy was broken. The probe runs once
 * per page load and gives the player (and the operator looking at the
 * tab) an unambiguous signal.
 *
 * The probe makes a single GET to `${NEXT_PUBLIC_API_URL}/../health/`
 * with a 4-second timeout. On failure it renders a sticky top banner.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
// Derive the health URL from the API URL by chopping off the trailing
// `/api/vN` segment. e.g. https://api.popcornguess.com/api/v1 -> .../health/
const HEALTH_URL = API_BASE
  ? API_BASE.replace(/\/api\/v\d+$/, '') + '/health/'
  : null;

const PROBE_TIMEOUT_MS = 4_000;

export default function BackendHealthProbe(): React.JSX.Element | null {
  const [status, setStatus] = useState<'ok' | 'down' | 'pending'>('pending');

  useEffect(() => {
    if (!HEALTH_URL) {
      setStatus('down');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch(HEALTH_URL, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });
        setStatus(res.ok ? 'ok' : 'down');
      } catch {
        setStatus('down');
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (status !== 'down') {
    return null;
  }

  // In dev / preview we show the failing URL inline because that's the
  // information an engineer needs to fix the misconfig fast. In a
  // production build we strip it — real players don't need (or deserve)
  // to see backend hostnames in a red banner.
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div
      role="alert"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        width: '100%',
        background: '#7f1d1d',
        color: '#fee2e2',
        padding: '0.625rem 1rem',
        textAlign: 'center',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}
    >
      We can&apos;t reach the PopcornGuess server right now. Today&apos;s
      puzzle and your streak may take a moment to load — please refresh
      in a few seconds.
      {isDev && HEALTH_URL && (
        <>
          {' '}
          <code style={{ opacity: 0.6, fontSize: '0.75rem' }}>
            ({HEALTH_URL})
          </code>
        </>
      )}
    </div>
  );
}

'use client';

/**
 * App-router global error boundary.
 *
 * Defined explicitly so Next does not auto-generate `_global-error`,
 * which under Next 16 prerender pulled in the layout's client chunks
 * and failed with "Cannot read properties of null (reading 'useContext')".
 *
 * This file owns its own <html> + <body>, so the layout is bypassed
 * entirely when the boundary fires. Zero hooks beyond useEffect (which
 * does not run during prerender).
 */

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({
  error,
  reset,
}: GlobalErrorProps): React.JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
          padding: '4rem 1rem',
          background: '#0a0a0a',
          color: '#fafafa',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#a3a3a3', marginBottom: '1.5rem' }}>
            PopcornGuess hit an unexpected error. Try again, and if it keeps
            happening, refresh the page.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '0.75rem',
                color: '#737373',
                marginBottom: '1.5rem',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #ffb347, #ff8c00)',
              border: 'none',
              color: '#0a0a0a',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

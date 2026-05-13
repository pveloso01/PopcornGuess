/**
 * App-router 404 page. Defined explicitly so Next does not auto-generate
 * its own `_not-found` route — the framework default conflicts with our
 * client-component layout under Next 16 prerender.
 *
 * Server-rendered, zero hooks, zero dependencies on the layout's client
 * components. The layout still wraps this page, which is fine because
 * the layout itself ships server-rendered metadata + plain HTML.
 */

import Link from 'next/link';

export const metadata = {
  title: 'Page not found',
  description: 'That page does not exist on PopcornGuess.',
};

export default function NotFound(): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1rem',
      }}
    >
      <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
        <div aria-hidden style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
          🎬
        </div>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            color: 'var(--text-primary)',
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
          }}
        >
          The page you&apos;re looking for is on the cutting-room floor.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #ffb347, #ff8c00)',
            color: '#0a0a0a',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Back to today&apos;s puzzle
        </Link>
      </div>
    </main>
  );
}

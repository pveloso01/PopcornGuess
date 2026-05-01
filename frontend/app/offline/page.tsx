/**
 * Offline fallback served by the service worker when navigating without
 * network. Kept intentionally tiny so it caches in a few KB.
 */

export const metadata = { title: 'Offline' };

export default function OfflinePage(): React.JSX.Element {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4" aria-hidden="true">
          📡
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          You&apos;re offline
        </h1>
        <p className="text-[var(--text-secondary)] mb-6">
          PopcornGuess needs a connection to load today&apos;s puzzle. We&apos;ll
          pick up where you left off as soon as you&apos;re back online.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 rounded-full bg-gradient-amber text-[var(--background)] font-bold hover:opacity-90"
        >
          Try again
        </a>
      </div>
    </main>
  );
}

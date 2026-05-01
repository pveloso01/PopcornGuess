import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DMCA / Copyright',
  description:
    'PopcornGuess only uses TMDb-licensed metadata (CC BY-NC-SA) and original AI-paraphrased prose. Send takedown notices here.',
};

export default function DMCAPage(): React.JSX.Element {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-invert">
      <h1 className="text-3xl font-bold mb-4">DMCA &amp; copyright</h1>
      <p>
        PopcornGuess builds its puzzles exclusively from{' '}
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          TMDb
        </a>{' '}
        metadata (titles, release years, synopses) — used under the TMDb
        attribution license — and AI-paraphrased original prose.{' '}
        <strong>We never store or serve copyrighted images, video, or audio.</strong>
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">If you are a rights-holder</h2>
      <p>
        If you believe a specific puzzle infringes a copyright you hold, send
        a notice that includes:
      </p>
      <ul>
        <li>Your contact details and signature.</li>
        <li>A description of the work.</li>
        <li>The URL of the puzzle in question.</li>
        <li>A statement of good-faith belief and accuracy under penalty of perjury.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
      <p>
        Email:{' '}
        <a href="mailto:dmca@popcornguess.com">dmca@popcornguess.com</a>
      </p>
      <p>
        We respond within 7 business days and remove or alter the puzzle while
        the claim is under review.
      </p>
    </main>
  );
}

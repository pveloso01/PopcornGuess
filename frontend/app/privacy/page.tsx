/**
 * Privacy Policy Page
 * Feature 23: Legal & Documentation
 */

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-[var(--text-secondary)]">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <h2>Information We Collect</h2>
        <p>
          PopcornGuess collects minimal information to provide our quiz services. We use device IDs
          for anonymous gameplay and track quiz progress locally.
        </p>

        <h2>How We Use Your Information</h2>
        <p>
          Your data is used solely to track quiz progress, maintain streaks, and provide leaderboard
          functionality.
        </p>

        <h2>Data Storage</h2>
        <p>
          Anonymous user data is stored locally in your browser. Quiz progress is synced with our
          servers to enable cross-device play.
        </p>

        <h2>Contact</h2>
        <p>For privacy concerns, contact us at privacy@popcornguess.com</p>
      </div>
    </div>
  );
}

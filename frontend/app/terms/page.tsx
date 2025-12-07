/**
 * Terms of Service Page
 * Feature 23: Legal & Documentation
 */

export default function TermsPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto prose prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-[var(--text-secondary)]">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <h2>Acceptance of Terms</h2>
        <p>By accessing PopcornGuess, you agree to these Terms of Service.</p>

        <h2>User Conduct</h2>
        <p>Users agree to play fairly, not cheat, and respect other players.</p>

        <h2>Intellectual Property</h2>
        <p>All quiz content, designs, and materials are property of PopcornGuess.</p>

        <h2>Limitation of Liability</h2>
        <p>PopcornGuess is provided &ldquo;as is&rdquo; without warranties of any kind.</p>
      </div>
    </div>
  );
}

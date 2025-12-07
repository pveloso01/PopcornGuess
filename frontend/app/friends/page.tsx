'use client';

/**
 * Feature 15: Friend System
 * Friends Page
 */

export default function FriendsPage() {
  // TODO: Implement friend system

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gradient-gold mb-8">Friends</h1>

        <div className="bg-[var(--background-secondary)] rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-bold mb-4">Friend System Coming Soon</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Create an account to add friends and challenge them to quizzes!
          </p>
          <a
            href="/auth/register"
            className="inline-block px-6 py-3 bg-gradient-amber text-[var(--background)] font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Create Account
          </a>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Feature 14: User Profile System
 * User Profile Page
 */

export default function ProfilePage() {
  // TODO: Implement full profile functionality

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gradient-gold mb-8">Your Profile</h1>

        <div className="bg-[var(--background-secondary)] rounded-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-amber rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
              👤
            </div>
            <h2 className="text-2xl font-bold">Anonymous Player</h2>
            <p className="text-[var(--text-secondary)]">Sign in to customize your profile</p>
          </div>
        </div>

        <div className="bg-[var(--background-secondary)] rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Account Settings</h3>
          <p className="text-[var(--text-secondary)]">
            Create an account to save your progress across devices and customize your profile.
          </p>
        </div>
      </div>
    </div>
  );
}

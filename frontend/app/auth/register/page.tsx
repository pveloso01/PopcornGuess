'use client';

/**
 * Feature 11: User Authentication System
 * Registration Page
 */

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
    console.log('Register attempt:', username, email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[var(--background-secondary)] rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Create Account</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--background)] focus:border-[var(--accent-primary)] outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--background)] focus:border-[var(--accent-primary)] outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--background)] focus:border-[var(--accent-primary)] outline-none"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-6 bg-gradient-amber text-[var(--background)] font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/auth/login" className="text-[var(--accent-primary)] hover:underline">
            Already have an account? Sign in
          </Link>
        </div>

        <div className="mt-8 text-xs text-center text-[var(--text-secondary)]">
          By creating an account, your anonymous progress will be preserved.
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Leaderboard Page
 *
 * Displays global, daily, and weekly leaderboards
 */

import { useState, useEffect } from 'react';
import LeaderboardTable from '@/components/LeaderboardTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';

type LeaderboardType = 'global' | 'daily' | 'weekly';

export default function LeaderboardPage() {
  const { deviceId } = useAnonymousUser();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leaderboard, setLeaderboard] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!deviceId) return;

      setIsLoading(true);
      try {
        const data = await api.analytics.getLeaderboard(deviceId, activeTab);
        setLeaderboard(data);
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [deviceId, activeTab]);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient-gold mb-4">🏆 Leaderboard</h1>
          <p className="text-xl text-[var(--text-secondary)]">Compete with players worldwide!</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'global'
                ? 'bg-gradient-amber text-[var(--background)]'
                : 'bg-[var(--background-secondary)] text-[var(--text-primary)] hover:bg-[var(--background)]'
            }`}
          >
            🌍 Global
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'daily'
                ? 'bg-gradient-amber text-[var(--background)]'
                : 'bg-[var(--background-secondary)] text-[var(--text-primary)] hover:bg-[var(--background)]'
            }`}
          >
            📅 Today
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'weekly'
                ? 'bg-gradient-amber text-[var(--background)]'
                : 'bg-[var(--background-secondary)] text-[var(--text-primary)] hover:bg-[var(--background)]'
            }`}
          >
            📊 This Week
          </button>
        </div>

        {/* Leaderboard */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <LeaderboardTable entries={leaderboard} currentDeviceId={deviceId || undefined} />
        )}
      </div>
    </div>
  );
}

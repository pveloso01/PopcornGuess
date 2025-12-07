'use client';

/**
 * Personal Stats Dashboard
 * Feature 10: Displays user stats and activity calendar
 */

import { useState, useEffect } from 'react';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import api from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function StatsPage() {
  const { deviceId } = useAnonymousUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!deviceId) return;
      try {
        const data = await api.analytics.getStats(deviceId);
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, [deviceId]);

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gradient-gold mb-8">Your Stats</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[var(--background-secondary)] rounded-lg p-6">
            <div className="text-4xl font-bold text-[var(--accent-primary)]">
              {stats?.total_quizzes_completed || 0}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Quizzes Completed</div>
          </div>
          <div className="bg-[var(--background-secondary)] rounded-lg p-6">
            <div className="text-4xl font-bold text-[var(--accent-primary)]">
              {stats?.average_score?.toFixed(1) || 0}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Average Score</div>
          </div>
          <div className="bg-[var(--background-secondary)] rounded-lg p-6">
            <div className="text-4xl font-bold text-[var(--accent-primary)]">
              {stats?.perfect_scores || 0}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Perfect Scores</div>
          </div>
        </div>
      </div>
    </div>
  );
}

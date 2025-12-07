'use client';

/**
 * LeaderboardTable Component
 *
 * Displays leaderboard rankings with:
 * - Rank, username, score
 * - Highlight current user
 * - Pagination
 */

interface LeaderboardEntry {
  id: number;
  user?: { username: string };
  anonymous_user?: { device_id: string };
  total_score: number;
  average_score: number;
  total_quizzes_completed: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: number;
  currentDeviceId?: string;
}

export default function LeaderboardTable({
  entries,
  currentUserId,
  currentDeviceId,
}: LeaderboardTableProps) {
  return (
    <div className="bg-[var(--background-secondary)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--background)] border-b border-[var(--background-secondary)]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                Rank
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                Player
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-primary)]">
                Score
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-primary)]">
                Avg Score
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-primary)]">
                Quizzes
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const isCurrentUser =
                (entry.user &&
                  entry.user.username &&
                  currentUserId &&
                  entry.user.username === String(currentUserId)) ||
                (entry.anonymous_user &&
                  entry.anonymous_user.device_id &&
                  currentDeviceId &&
                  entry.anonymous_user.device_id === currentDeviceId);

              return (
                <tr
                  key={entry.id}
                  className={`border-b border-[var(--background)] ${
                    isCurrentUser ? 'bg-[var(--accent-primary)]/10' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-[var(--text-primary)]">
                    <span className="flex items-center gap-2">
                      {index + 1 === 1 && '🥇'}
                      {index + 1 === 2 && '🥈'}
                      {index + 1 === 3 && '🥉'}
                      <span className="font-bold">{index + 1}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-primary)] font-medium">
                    {entry.user?.username ||
                      `Player ${entry.anonymous_user?.device_id.slice(0, 8)}`}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-[var(--accent-primary)]">(You)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-[var(--text-primary)] font-bold">
                    {entry.total_score}
                  </td>
                  <td className="px-6 py-4 text-right text-[var(--text-secondary)]">
                    {entry.average_score.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-right text-[var(--text-secondary)]">
                    {entry.total_quizzes_completed}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No leaderboard data available yet. Complete quizzes to appear here!
        </div>
      )}
    </div>
  );
}

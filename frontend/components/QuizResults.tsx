/**
 * QuizResults Component
 *
 * Displays quiz completion results:
 * - Score breakdown with achievement badge
 * - Correct/incorrect answers with explanations
 * - Community stats
 * - Share functionality
 */

import Link from 'next/link';
import ShareButton from './ShareButton';
import { getScoreBadge } from '@/lib/shareFormat';

interface QuizResultsProps {
  results: {
    quiz_id: number;
    quiz_title: string;
    score: number;
    total_questions: number;
    percentage: number;
    is_perfect: boolean;
    time_taken_seconds: number | null;
    questions_with_answers: Array<{
      id: number;
      text: string;
      correct_answer: string;
      explanation: string;
      image_url?: string;
      success_rate: number;
    }>;
    community_stats: {
      total_attempts: number;
      total_completions: number;
      completion_rate: number;
      average_score: number;
    };
    shareable_text: string;
  };
}

export default function QuizResults({ results }: QuizResultsProps) {
  const {
    quiz_title,
    score,
    total_questions,
    percentage,
    is_perfect,
    time_taken_seconds,
    questions_with_answers,
    community_stats,
    shareable_text,
  } = results;

  const badge = getScoreBadge(score, total_questions);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Score Display */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {is_perfect ? '🏆 Perfect Score! 🏆' : 'Quiz Complete!'}
          </h1>

          <div className="text-8xl mb-4">{badge.emoji}</div>

          <div className="text-6xl font-bold mb-2 text-gradient-gold">
            {score}/{total_questions}
          </div>

          <p className="text-[var(--text-secondary)] text-xl mb-2">
            {Math.round(percentage)}% Correct
          </p>

          <p className="text-[var(--accent-primary)] font-bold text-lg">{badge.name}</p>

          {time_taken_seconds && (
            <p className="text-[var(--text-secondary)] mt-2">
              Time: {formatTime(time_taken_seconds)}
            </p>
          )}
        </div>

        {/* Community Stats */}
        <div className="bg-[var(--background-secondary)] rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-center">Community Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--accent-primary)]">
                {community_stats.total_attempts}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Players</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--accent-primary)]">
                {Math.round(community_stats.completion_rate)}%
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--accent-primary)]">
                {community_stats.average_score.toFixed(1)}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Avg Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--accent-primary)]">
                {percentage > community_stats.average_score ? '📈' : '📊'}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {percentage > community_stats.average_score ? 'Above Avg' : 'Keep Going'}
              </div>
            </div>
          </div>
        </div>

        {/* Share Button */}
        <div className="mb-8">
          <ShareButton shareText={shareable_text} quizTitle={quiz_title} />
        </div>

        {/* Answer Review */}
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold">Answer Review</h2>
          {questions_with_answers.map((question, index) => (
            <div key={question.id} className="bg-[var(--background-secondary)] rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-[var(--text-secondary)]">{index + 1}</div>
                <div className="flex-1">
                  <p className="font-medium mb-2 text-lg">{question.text}</p>

                  {question.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={question.image_url}
                      alt="Question"
                      className="rounded-lg mb-4 max-w-full h-auto"
                    />
                  )}

                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-3">
                    <p className="text-sm text-[var(--text-secondary)] mb-1">Correct Answer:</p>
                    <p className="text-green-600 font-bold">{question.correct_answer}</p>
                  </div>

                  {question.explanation && (
                    <div className="bg-[var(--background)] rounded-lg p-4">
                      <p className="text-[var(--text-secondary)] text-sm">{question.explanation}</p>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-[var(--text-secondary)]">
                    {Math.round(question.success_rate)}% of players got this correct
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-amber rounded-lg p-8">
          <h3 className="text-2xl font-bold text-[var(--background)] mb-4">
            Come back tomorrow for a new challenge! 🍿
          </h3>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[var(--background)] text-[var(--text-primary)] font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Quiz Results Page
 *
 * Displays quiz results with:
 * - Score and performance
 * - Answer review with explanations
 * - Community stats
 * - Social sharing options
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAnonymousUser } from '@/hooks/useAnonymousUser';
import QuizResults from '@/components/QuizResults';
import Confetti from '@/components/Confetti';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api';

interface QuizResultsData {
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
}

function QuizResultsContent() {
  const searchParams = useSearchParams();
  const { deviceId } = useAnonymousUser();
  const [results, setResults] = useState<QuizResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const quizId = searchParams.get('quiz');
  const progressId = searchParams.get('progress');

  useEffect(() => {
    const loadResults = async () => {
      if (!quizId || !deviceId) return;

      try {
        setIsLoading(true);
        const data = (await api.quizzes.getResults(parseInt(quizId), deviceId)) as QuizResultsData;
        setResults(data);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [quizId, progressId, deviceId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)]">Results not found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {results.is_perfect && <Confetti />}
      <QuizResults results={results} />
    </>
  );
}

export default function QuizResultsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <QuizResultsContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import QuizQuestion, { Question } from '@/components/QuizQuestion';
import AnswerInput from '@/components/AnswerInput';
import QuizResults from '@/components/QuizResults';
import Navbar from '@/components/Navbar';

/**
 * Quiz Page
 *
 * Main quiz gameplay experience:
 * - Fetches daily quiz from API
 * - Shows questions one at a time
 * - Handles answer submission with feedback
 * - Shows results at the end
 */

// Mock data for demonstration
const mockQuestions: Question[] = [
  {
    id: 1,
    question_type: 'emoji',
    text: 'Guess the movie from these emojis:',
    emoji_clues: '🦁👑🌍',
    difficulty: 'easy',
  },
  {
    id: 2,
    question_type: 'quote',
    text: "I'm gonna make him an offer he can't refuse.",
    difficulty: 'medium',
  },
  {
    id: 3,
    question_type: 'text',
    text: 'Which 1994 film features a character named Forrest who shares stories while sitting on a bench?',
    difficulty: 'easy',
  },
];

type GameState = 'playing' | 'results';

interface AnswerResult {
  id: number;
  text: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
  attempts_used: number;
}

export default function QuizPage() {
  const [gameState, setGameState] = useState<GameState>('playing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [lastAnswer, setLastAnswer] = useState('');

  const maxAttempts = 6;
  const currentQuestion = mockQuestions[currentQuestionIndex];

  // Mock correct answers (in real app, this comes from API)
  const correctAnswers: Record<number, string> = {
    1: 'The Lion King',
    2: 'The Godfather',
    3: 'Forrest Gump',
  };

  const handleSubmitAnswer = (answer: string) => {
    setLastAnswer(answer);
    const correct = answer.toLowerCase().trim() === correctAnswers[currentQuestion.id].toLowerCase().trim();
    setIsCorrect(correct);
    setAttemptsUsed((prev) => prev + 1);

    if (correct) {
      setScore((prev) => prev + 1);
      // Short delay before moving to next question
      setTimeout(() => {
        recordResult(correct, answer);
        moveToNextQuestion();
      }, 1500);
    } else if (attemptsUsed + 1 >= maxAttempts) {
      // Out of attempts
      setTimeout(() => {
        recordResult(false, answer);
        moveToNextQuestion();
      }, 1500);
    }
  };

  const recordResult = (correct: boolean, answer: string) => {
    setResults((prev) => [
      ...prev,
      {
        id: currentQuestion.id,
        text: currentQuestion.text,
        correct_answer: correctAnswers[currentQuestion.id],
        user_answer: answer,
        is_correct: correct,
        attempts_used: attemptsUsed + 1,
      },
    ]);
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex + 1 >= mockQuestions.length) {
      setGameState('results');
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setAttemptsUsed(0);
      setIsCorrect(null);
      setLastAnswer('');
    }
  };

  const handleShare = () => {
    const shareText = generateShareText();
    if (navigator.share) {
      navigator.share({
        title: 'PopcornGuess Results',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Results copied to clipboard!');
    }
  };

  const generateShareText = () => {
    const date = new Date().toLocaleDateString();
    const boxes = results
      .map((r) => (r.is_correct ? '🟩' : '🟥'))
      .join('');
    return `🍿 PopcornGuess ${date}\n${score}/${mockQuestions.length}\n\n${boxes}\n\nhttps://popcornguess.com`;
  };

  if (gameState === 'results') {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Navbar />
        <div className="pt-8 pb-16 px-4">
          <QuizResults
            score={score}
            totalQuestions={mockQuestions.length}
            results={results}
            streak={5} // Mock streak
            bestStreak={12} // Mock best streak
            timeTaken={120} // Mock time
            onShare={handleShare}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />

      <div className="pt-8 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Quiz header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient-gold mb-2">
              Daily Quiz
            </h1>
            <p className="text-[var(--text-muted)]">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Question */}
          <div className="mb-12">
            <QuizQuestion
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={mockQuestions.length}
            />
          </div>

          {/* Answer input */}
          <AnswerInput
            onSubmit={handleSubmitAnswer}
            isCorrect={isCorrect}
            attemptsUsed={attemptsUsed}
            maxAttempts={maxAttempts}
            disabled={isCorrect === true || attemptsUsed >= maxAttempts}
            placeholder="Type the movie or show name..."
          />

          {/* Hint section (could be expanded) */}
          {attemptsUsed >= 2 && isCorrect !== true && (
            <div className="mt-8 text-center">
              <button className="text-sm text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors">
                💡 Need a hint?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


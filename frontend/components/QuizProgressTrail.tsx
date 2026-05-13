'use client';

/**
 * Visual progress trail for a multi-question daily quiz.
 *
 * One small marker per question. The marker for each completed
 * question is green (correct) or red (incorrect); the current question
 * gets a gold ring; unanswered ones are neutral. No numeric score —
 * the trail itself is the indicator, matching how NYT Connections
 * shows mistake-dots and Wordle shows row colours.
 *
 * Why this and not a "Solved X / Y" line:
 * - Every Wordle clone (Wordle, Framed, Moviedle, Pokedle, LoLdle,
 *   Connections) removes mid-game numeric scoreboards. They feel
 *   mobile-freemium, not "daily ritual".
 * - A visual trail conveys the same information at a glance plus the
 *   shape of the run (e.g. "3 right then 2 wrong" is meaningful).
 * - It mirrors the spoiler-free emoji share grid the player will
 *   eventually copy, building familiarity with the visual language.
 */

interface Answer {
  questionId: number;
  isCorrect: boolean;
}

interface QuizProgressTrailProps {
  totalQuestions: number;
  /** Already-submitted answers in order. */
  answers: Answer[];
  /** 0-based index of the question currently being played. */
  currentQuestionIndex: number;
}

export default function QuizProgressTrail({
  totalQuestions,
  answers,
  currentQuestionIndex,
}: QuizProgressTrailProps): React.JSX.Element {
  return (
    <div
      role="list"
      aria-label="Question progress"
      className="flex flex-wrap justify-center gap-1.5"
    >
      {Array.from({ length: totalQuestions }).map((_, i) => {
        const answered = i < answers.length;
        const isCurrent = i === currentQuestionIndex;
        const isCorrect = answered ? answers[i].isCorrect : null;

        let bg = 'bg-[var(--background-tertiary)]';
        if (answered) {
          bg = isCorrect ? 'bg-[var(--success)]' : 'bg-[var(--error)]';
        }
        const ring = isCurrent ? 'ring-2 ring-[var(--gold)]' : '';

        return (
          <span
            key={i}
            role="listitem"
            aria-label={
              answered
                ? `Question ${i + 1}: ${isCorrect ? 'correct' : 'incorrect'}`
                : isCurrent
                  ? `Question ${i + 1}: in progress`
                  : `Question ${i + 1}: not yet played`
            }
            className={`block h-2 w-6 rounded-sm transition-all duration-300 ${bg} ${ring}`}
          />
        );
      })}
    </div>
  );
}

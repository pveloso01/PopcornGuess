'use client';

/**
 * Visual progress trail for a multi-question daily quiz.
 *
 * One small marker per question. Each marker shows the per-question
 * outcome computed from the full attempt history:
 *   - green : question has at least one correct attempt
 *   - red   : we've moved past the question without a correct attempt
 *   - gold ring : currently being played
 *   - neutral : not yet reached
 *
 * Why grouped-by-questionId and not positional (`answers[i]`):
 * useQuizSession pushes one entry to `answers` PER ATTEMPT. A question
 * solved on the third try inserts three entries — the next question's
 * marker would then read the wrong attempt and flicker the colour
 * after the question advanced.
 *
 * No numeric score — every Wordle clone (Wordle, Framed, Pokedle,
 * Moviedle, Connections, etc.) uses a visual indicator and saves the
 * tally for the end-of-game stats screen.
 */

interface Answer {
  questionId: number;
  isCorrect: boolean;
}

interface QuestionRef {
  id: number;
}

interface QuizProgressTrailProps {
  questions: QuestionRef[];
  /** All attempts, in order. May include multiple entries per question. */
  answers: Answer[];
  /** 0-based index of the question currently being played. */
  currentQuestionIndex: number;
}

export default function QuizProgressTrail({
  questions,
  answers,
  currentQuestionIndex,
}: QuizProgressTrailProps): React.JSX.Element {
  // Group attempts by question id once, so each marker can ask
  // "did this specific question end correctly?"
  const attemptsByQuestion = new Map<number, Answer[]>();
  for (const a of answers) {
    const bucket = attemptsByQuestion.get(a.questionId) ?? [];
    bucket.push(a);
    attemptsByQuestion.set(a.questionId, bucket);
  }

  return (
    <div
      role="list"
      aria-label="Question progress"
      className="flex flex-wrap justify-center gap-1.5"
    >
      {questions.map((q, i) => {
        const attempts = attemptsByQuestion.get(q.id) ?? [];
        const hasCorrect = attempts.some((a) => a.isCorrect);
        const isCurrent = i === currentQuestionIndex;
        const isPast = i < currentQuestionIndex;

        // Per-question state:
        //   - solved   = at least one correct attempt
        //   - missed   = moved past the question without solving
        //   - current  = actively playing (may have wrong attempts so far)
        //   - upcoming = haven't reached it
        let bg: string;
        let label: string;
        if (hasCorrect) {
          bg = 'bg-[var(--success)]';
          label = `Question ${i + 1}: correct`;
        } else if (isPast) {
          bg = 'bg-[var(--error)]';
          label = `Question ${i + 1}: missed`;
        } else if (isCurrent) {
          bg = 'bg-[var(--background-tertiary)]';
          label = `Question ${i + 1}: in progress`;
        } else {
          bg = 'bg-[var(--background-tertiary)]';
          label = `Question ${i + 1}: not yet played`;
        }
        const ring = isCurrent ? 'ring-2 ring-[var(--gold)]' : '';

        return (
          <span
            key={q.id}
            role="listitem"
            aria-label={label}
            className={`block h-2 w-6 rounded-sm transition-all duration-300 ${bg} ${ring}`}
          />
        );
      })}
    </div>
  );
}

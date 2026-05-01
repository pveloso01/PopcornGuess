import { redirect } from 'next/navigation';

/**
 * /quiz redirects to today's daily puzzle.
 * The mock-data quiz that previously lived here was removed in Phase 0
 * stabilization to prevent confusion with the real /quiz/daily flow.
 */
export default function QuizIndex(): never {
  redirect('/quiz/daily');
}

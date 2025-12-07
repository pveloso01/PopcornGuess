'use client';

/**
 * Quiz Question Component
 *
 * Displays a quiz question with support for multiple formats:
 * - TEXT: Standard text question
 * - IMAGE: Movie still or poster-based question
 * - QUOTE: Famous movie/TV quote
 * - EMOJI: Emoji representation of a movie/show
 */

export type QuestionType = 'text' | 'image' | 'quote' | 'emoji' | 'audio' | 'silhouette';

export interface Question {
  id: number;
  question_type: QuestionType;
  text: string;
  image_url?: string;
  emoji_clues?: string;
  audio_url?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizQuestionProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  attemptsLeft?: number;
  maxAttempts?: number;
  onSubmitAnswer?: (answer: string) => void | Promise<void>;
  showFeedback?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastAnswerResult?: any;
  onNext?: () => void;
  isSubmitting?: boolean;
}

const difficultyColors = {
  easy: 'text-[var(--success)] bg-[var(--success)]/10',
  medium: 'text-[var(--warning)] bg-[var(--warning)]/10',
  hard: 'text-[var(--error)] bg-[var(--error)]/10',
};

const questionTypeIcons = {
  text: '📝',
  image: '🖼️',
  quote: '💬',
  emoji: '🎬',
  audio: '🎵',
  silhouette: '👤',
};

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
}: QuizQuestionProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Question header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{questionTypeIcons[question.question_type]}</span>
          <span className="text-[var(--text-secondary)]">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${difficultyColors[question.difficulty]}`}
        >
          {question.difficulty}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--background-tertiary)] rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-amber transition-all duration-500"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question content */}
      <div className="animate-fade-up">
        {question.question_type === 'emoji' && question.emoji_clues && (
          <EmojiQuestion text={question.text} emojis={question.emoji_clues} />
        )}

        {question.question_type === 'image' && question.image_url && (
          <ImageQuestion text={question.text} imageUrl={question.image_url} />
        )}

        {question.question_type === 'quote' && <QuoteQuestion text={question.text} />}

        {question.question_type === 'text' && <TextQuestion text={question.text} />}

        {question.question_type === 'silhouette' && question.image_url && (
          <SilhouetteQuestion text={question.text} imageUrl={question.image_url} />
        )}
      </div>
    </div>
  );
}

// Sub-components for different question types

function EmojiQuestion({ text, emojis }: { text: string; emojis: string }) {
  return (
    <div className="text-center">
      <p className="text-lg text-[var(--text-secondary)] mb-6">{text}</p>
      <div className="text-6xl md:text-8xl tracking-wider animate-bounce-in">{emojis}</div>
    </div>
  );
}

function ImageQuestion({ text, imageUrl }: { text: string; imageUrl: string }) {
  return (
    <div className="text-center">
      <p className="text-lg text-[var(--text-secondary)] mb-6">{text}</p>
      <div className="relative aspect-video rounded-xl overflow-hidden shadow-xl">
        <img src={imageUrl} alt="Movie still" className="w-full h-full object-cover" />
        {/* Blur overlay for progressive reveal */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)]/50 to-transparent" />
      </div>
    </div>
  );
}

function QuoteQuestion({ text }: { text: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Name the movie or show this quote is from:
      </p>
      <blockquote className="relative">
        <span className="absolute -left-4 -top-4 text-6xl text-[var(--gold)]/20">&ldquo;</span>
        <p className="text-2xl md:text-3xl italic text-[var(--text-primary)] leading-relaxed px-8">
          {text}
        </p>
        <span className="absolute -right-4 bottom-0 text-6xl text-[var(--gold)]/20">&rdquo;</span>
      </blockquote>
    </div>
  );
}

function TextQuestion({ text }: { text: string }) {
  return (
    <div className="text-center">
      <p className="text-xl md:text-2xl text-[var(--text-primary)] leading-relaxed">{text}</p>
    </div>
  );
}

function SilhouetteQuestion({ text, imageUrl }: { text: string; imageUrl: string }) {
  return (
    <div className="text-center">
      <p className="text-lg text-[var(--text-secondary)] mb-6">{text}</p>
      <div className="relative w-64 h-64 mx-auto">
        <img
          src={imageUrl}
          alt="Silhouette"
          className="w-full h-full object-contain filter brightness-0"
          style={{ filter: 'brightness(0)' }}
        />
      </div>
    </div>
  );
}

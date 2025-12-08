'use client';

import { useState, useRef, useEffect } from 'react';

const EMPTY_SUGGESTIONS: string[] = [];

/**
 * Answer Input Component
 *
 * Input field for quiz answers with:
 * - Autocomplete suggestions (optional)
 * - Visual feedback for correct/incorrect answers
 * - Attempt counter
 */

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  isCorrect?: boolean | null;
  attemptsUsed: number;
  maxAttempts: number;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

export default function AnswerInput({
  onSubmit,
  isCorrect,
  attemptsUsed,
  maxAttempts,
  disabled = false,
  placeholder = 'Type your answer...',
  suggestions,
}: AnswerInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const availableSuggestions = suggestions ?? EMPTY_SUGGESTIONS;

  const attemptsRemaining = maxAttempts - attemptsUsed;

  // Filter suggestions based on input
  useEffect(() => {
    if (input.length >= 2 && availableSuggestions.length > 0) {
      const filtered = availableSuggestions
        .filter((s) => s.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 5);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
    setSelectedIndex(-1);
  }, [input, availableSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSubmit(input.trim());
      setInput('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      setInput(filteredSuggestions[selectedIndex]);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Visual feedback classes
  const getInputClasses = () => {
    const base =
      'w-full px-6 py-4 text-lg bg-[var(--background-secondary)] border-2 rounded-xl outline-none transition-all duration-300';

    if (isCorrect === true) {
      return `${base} border-[var(--success)] text-[var(--success)] animate-pulse`;
    }
    if (isCorrect === false) {
      return `${base} border-[var(--error)] animate-shake`;
    }
    return `${base} border-[var(--border)] focus:border-[var(--gold)] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.2)]`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Attempts remaining */}
      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: maxAttempts }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i < attemptsUsed
                ? 'bg-[var(--error)]'
                : 'bg-[var(--background-tertiary)]'
            }`}
          />
        ))}
      </div>

      <p className="text-center text-sm text-[var(--text-muted)] mb-4">
        {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'}{' '}
        remaining
      </p>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            disabled={disabled}
            className={getInputClasses()}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />

          {/* Submit button */}
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-[var(--amber)] 
                       text-[var(--background)] font-semibold rounded-lg hover:bg-[var(--amber-light)] 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-2 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl overflow-hidden shadow-lg animate-fade-in">
            {filteredSuggestions.map((suggestion, index) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-[var(--background-tertiary)] transition-colors ${
                    index === selectedIndex
                      ? 'bg-[var(--background-tertiary)] text-[var(--gold)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {/* Feedback message */}
      {isCorrect === true && (
        <div className="mt-4 text-center animate-bounce-in">
          <span className="text-2xl">🎉</span>
          <p className="text-[var(--success)] font-semibold">Correct!</p>
        </div>
      )}

      {isCorrect === false && attemptsRemaining > 0 && (
        <div className="mt-4 text-center animate-fade-in">
          <p className="text-[var(--error)]">Not quite! Try again.</p>
        </div>
      )}

      {isCorrect === false && attemptsRemaining === 0 && (
        <div className="mt-4 text-center animate-fade-in">
          <span className="text-2xl">😅</span>
          <p className="text-[var(--error)]">Out of attempts!</p>
        </div>
      )}
    </div>
  );
}

'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { api, type TitleSuggestion } from '@/lib/api';

interface TitleAutocompleteProps {
  /** Controlled value of the input. */
  value: string;
  /** Called on every keystroke. */
  onChange: (next: string) => void;
  /** Called when the user picks a suggestion (Enter / click). */
  onSelect?: (suggestion: TitleSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Submit on Enter when no suggestion is highlighted. */
  onSubmit?: () => void;
  className?: string;
  /** ARIA label for the input. */
  label?: string;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 180;

/**
 * Accessible title combobox following the WAI-ARIA 1.2 pattern.
 *
 * Why we wrote this instead of pulling in a combobox library:
 *   - No runtime dep added (we want a small JS bundle on free Vercel).
 *   - Strict ARIA semantics so screen readers announce options.
 *   - Keyboard-only operation: Up/Down/Home/End/Esc/Enter.
 */
const TitleAutocomplete = forwardRef<HTMLInputElement, TitleAutocompleteProps>(
  function TitleAutocomplete(
    {
      value,
      onChange,
      onSelect,
      onSubmit,
      placeholder = 'Type a movie or show…',
      disabled = false,
      className,
      label = 'Movie or TV show title',
      autoFocus = false,
    },
    ref
  ) {
    const listboxId = useId();
    const optionIdPrefix = useId();
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [loading, setLoading] = useState(false);
    const requestSeq = useRef(0);
    const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced fetch of suggestions whenever the user types ≥ 2 chars.
    useEffect(() => {
      const trimmed = value.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setActiveIndex(-1);
        setLoading(false);
        return;
      }

      const seq = ++requestSeq.current;
      const handle = setTimeout(async () => {
        setLoading(true);
        try {
          const response = await api.quizzes.autocompleteTitles(trimmed);
          if (seq !== requestSeq.current) return;
          setSuggestions(response.results);
          setActiveIndex(response.results.length > 0 ? 0 : -1);
        } catch {
          if (seq === requestSeq.current) {
            setSuggestions([]);
            setActiveIndex(-1);
          }
        } finally {
          if (seq === requestSeq.current) {
            setLoading(false);
          }
        }
      }, DEBOUNCE_MS);

      return () => clearTimeout(handle);
    }, [value]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (suggestions.length === 0) return;
          setOpen(true);
          setActiveIndex((prev) => (prev + 1) % suggestions.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (suggestions.length === 0) return;
          setOpen(true);
          setActiveIndex(
            (prev) => (prev - 1 + suggestions.length) % suggestions.length
          );
          return;
        }
        if (event.key === 'Home') {
          event.preventDefault();
          setActiveIndex(0);
          return;
        }
        if (event.key === 'End') {
          event.preventDefault();
          setActiveIndex(suggestions.length - 1);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
          return;
        }
        if (event.key === 'Enter') {
          // Enter on a highlighted suggestion picks AND submits in one
          // press — onSelect is the parent's submit hook for the picked
          // value (avoids reading not-yet-flushed input state). Two
          // presses surprised playtesters who expect Wordle-style Enter.
          if (open && activeIndex >= 0 && suggestions[activeIndex]) {
            event.preventDefault();
            const picked = suggestions[activeIndex];
            onChange(picked.title);
            onSelect?.(picked);
            setOpen(false);
            return;
          }
          if (onSubmit) {
            event.preventDefault();
            onSubmit();
          }
        }
      },
      [activeIndex, onChange, onSelect, onSubmit, open, suggestions]
    );

    const handleBlur = useCallback(() => {
      // Delay closing so a click on an option still registers.
      blurTimer.current = setTimeout(() => setOpen(false), 120);
    }, []);

    const handleFocus = useCallback(() => {
      if (blurTimer.current) {
        clearTimeout(blurTimer.current);
        blurTimer.current = null;
      }
      if (suggestions.length > 0) setOpen(true);
    }, [suggestions.length]);

    const showList = open && suggestions.length > 0;

    return (
      <div className={`relative ${className ?? ''}`}>
        <label className="sr-only" htmlFor={`${optionIdPrefix}-input`}>
          {label}
        </label>
        <input
          id={`${optionIdPrefix}-input`}
          ref={ref}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0
              ? `${optionIdPrefix}-option-${activeIndex}`
              : undefined
          }
          aria-busy={loading || undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full px-4 py-3 rounded-lg bg-[var(--background-secondary)]
                     border border-[var(--border)] text-[var(--text-primary)]
                     placeholder:text-[var(--text-secondary)]
                     focus:outline-none focus:ring-2 focus:ring-[var(--gold)]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {showList && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-auto
                       rounded-lg border border-[var(--border)]
                       bg-[var(--background)] shadow-xl"
          >
            {suggestions.map((s, i) => {
              const isActive = i === activeIndex;
              return (
                <li
                  key={s.id}
                  id={`${optionIdPrefix}-option-${i}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(event) => {
                    // mouseDown so the input doesn't blur and close the list first.
                    event.preventDefault();
                    onChange(s.title);
                    onSelect?.(s);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`px-4 py-2 cursor-pointer flex items-center justify-between gap-3
                              ${
                                isActive
                                  ? 'bg-[var(--background-secondary)]'
                                  : ''
                              }`}
                >
                  <span className="truncate text-[var(--text-primary)]">
                    {s.title}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {s.kind === 'tv' ? 'TV' : 'Movie'}
                    {s.year ? ` · ${s.year}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);

export default TitleAutocomplete;

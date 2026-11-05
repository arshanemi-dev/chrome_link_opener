'use client';

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { digitsOnly } from '@/lib/linkOpener/desktopPin';

// Six boxes driven by ONE transparent <input> laid over them — so typing,
// Backspace, paste of a whole code and the OS's one-time-code autofill all
// just work. `masked` shows dots (PIN); `shake` is a counter: bump it to shake
// the row after a wrong code. `onComplete(value)` fires once all digits are in.
export default function CodeField({
  value,
  onChange,
  onComplete,
  length = 6,
  masked = false,
  invalid = false,
  readOnly = false,
  autoFocus = true,
  shake = 0,
  label,
  autoComplete = 'off',
}) {
  const inputRef = useRef(null);
  const rowRef = useRef(null);
  const [focused, setFocused] = useState(false);

  // Shake via the Web Animations API — no state, so no re-render loop.
  useEffect(() => {
    if (!shake || !rowRef.current?.animate) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    rowRef.current.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(7px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 420, easing: 'ease-in-out' },
    );
    inputRef.current?.focus();
  }, [shake]);

  // Back from read-only (request finished) → keep the caret in the field.
  useEffect(() => {
    if (!readOnly && autoFocus) inputRef.current?.focus();
  }, [readOnly, autoFocus]);

  function handleChange(e) {
    const next = digitsOnly(e.target.value, length);
    onChange(next);
    if (next.length === length && next !== value) onComplete?.(next);
  }

  const active = Math.min(value.length, length - 1);

  return (
    <div className="relative w-full" onClick={() => inputRef.current?.focus()}>
      <div ref={rowRef} className="flex justify-center gap-2 sm:gap-2.5" aria-hidden="true">
        {Array.from({ length }, (_, i) => {
          const filled = i < value.length;
          const isActive = focused && !readOnly && i === active && !(value.length === length && i === length - 1 && filled);
          return (
            <div
              key={i}
              className={clsx(
                'relative flex h-14 w-12 items-center justify-center rounded-xl border-2 bg-background text-2xl font-bold text-foreground transition-all duration-150',
                invalid
                  ? 'border-neg/70 bg-neg/5'
                  : isActive
                    ? 'border-accent shadow-[0_0_0_4px_rgba(var(--color-accent-rgb),0.15)]'
                    : filled
                      ? 'border-accent/40'
                      : 'border-divider-light',
                readOnly && 'opacity-70',
              )}
            >
              {filled ? (
                masked ? (
                  <span className="pin-pop block h-3.5 w-3.5 rounded-full bg-foreground" />
                ) : (
                  <span className="pin-pop">{value[i]}</span>
                )
              ) : (
                isActive && <span className="h-6 w-0.5 animate-pulse rounded bg-accent" />
              )}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        readOnly={readOnly}
        autoFocus={autoFocus}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        autoComplete={autoComplete}
        aria-label={label}
        aria-invalid={invalid || undefined}
        type="text"
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
        spellCheck={false}
      />
    </div>
  );
}

'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus } from 'lucide-react';

// The Chrome Profile field of the Add / Edit row: a text box that drops down
// every known profile on click — this computer's Chrome profiles (desktop app)
// plus the ones already used in the list — each with how many accounts use it.
// Typing narrows the list; any new text is kept as-is (a new profile).
// `options` = [{ value, name, count }]; Enter / Escape fall through to
// onEnter / onEscape while the list is closed. The list floats on <body>
// (fixed, under the box — or above it near the bottom of the screen), so the
// table's scroll area can't clip it when editing a lower row.
export default function ProfileCombo({ value, onChange, options, onEnter, onEscape, className, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null); // null = show all; text once the user types
  const [active, setActive] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const [pos, setPos] = useState(null); // { left, top | bottom, minWidth }

  const q = query?.trim().toLowerCase() ?? '';
  const shown = q ? options.filter((o) => o.value.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)) : options;
  const typed = value.trim();
  const isNew = !!typed && !options.some((o) => o.value.toLowerCase() === typed.toLowerCase());

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom;
      setPos({
        left: Math.max(8, Math.min(r.left, window.innerWidth - 296)),
        minWidth: r.width,
        ...(below < 260 && r.top > below ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true); // the table's own scroll too
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => !ref.current?.contains(e.target) && !listRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function show() {
    setQuery(null);
    setActive(-1);
    setOpen(true);
  }

  function pick(v) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return show();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (shown.length ? (i + step + shown.length) % shown.length : -1));
    } else if (e.key === 'Enter') {
      if (open && shown[active]) {
        e.preventDefault();
        pick(shown[active].value);
      } else {
        setOpen(false);
        onEnter?.();
      }
    } else if (e.key === 'Escape') {
      if (open) setOpen(false);
      else onEscape?.();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative w-full min-w-[9rem]">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setQuery(e.target.value); setActive(-1); setOpen(true); }}
        onFocus={show}
        onClick={() => !open && show()}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={`${className} pr-6`}
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => { e.preventDefault(); if (open) setOpen(false); else show(); }}
        aria-label="Show profiles"
        className="absolute right-1 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground"
      >
        <ChevronDown size={12} />
      </button>

      {open && pos && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          style={pos}
          className="dropdown-panel-in fixed z-[70] max-h-60 w-max max-w-[18rem] overflow-y-auto rounded-lg border border-divider-light bg-background p-1 text-left text-xs text-foreground shadow-lg shadow-black/10"
        >
          <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
            <span>Profile</span>
            <span>Accounts</span>
          </div>
          {shown.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === typed}
              onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center justify-between gap-4 rounded-md px-2 py-1.5 ${
                i === active ? 'bg-card-hover' : ''
              } ${o.value === typed ? 'font-semibold text-accent' : ''}`}
            >
              <span className="min-w-0 truncate">
                {o.name}
                {o.name !== o.value && <span className="ml-1.5 font-mono text-[10px] text-subtle">{o.value}</span>}
              </span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${o.count ? 'bg-accent/10 text-accent' : 'text-subtle'}`}>
                {o.count}
              </span>
            </button>
          ))}
          {!shown.length && !isNew && <p className="px-2 py-1.5 text-subtle">No profiles yet — type a name</p>}
          {isNew && (
            <div className="mt-0.5 flex items-center gap-1.5 border-t border-divider px-2 pb-1 pt-1.5 text-subtle">
              <Plus size={11} /> New profile <span className="font-mono text-foreground">{typed}</span>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

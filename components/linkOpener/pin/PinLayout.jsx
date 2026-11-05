'use client';

import { clsx } from 'clsx';
import { Check, ShieldCheck, LockKeyhole, MessageCircle, LogOut } from 'lucide-react';

// Full-window lock screen chrome: a brand panel (progress steps or a welcome
// line) beside the form card. Every PIN screen — setup, unlock, reset — sits in it.
export default function PinLayout({ user, onLogout, steps, current = 0, aside, icon: Icon = LockKeyhole, tone = 'accent', title, subtitle, children, footer }) {
  return (
    <div className="fixed inset-0 z-[90] flex overflow-y-auto bg-surface" role="dialog" aria-modal="true" aria-labelledby="pin-title">
      <aside className="relative hidden w-[40%] max-w-md shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#2a0a5e] via-accent to-accent-vivid p-10 text-white md:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-cyan/30 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <ShieldCheck size={22} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Barmeto Link Opener</p>
              <p className="text-xs text-white/70">Desktop app security</p>
            </div>
          </div>

          <div className="mt-12">{aside}</div>

          {steps && (
            <ol className="mt-10 space-y-1">
              {steps.map((step, i) => {
                const done = i < current;
                const now = i === current;
                return (
                  <li key={step.title} className="relative flex gap-3.5 pb-6 last:pb-0">
                    {i < steps.length - 1 && (
                      <span aria-hidden="true" className={clsx('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 rounded', done ? 'bg-white' : 'bg-white/25')} />
                    )}
                    <span
                      className={clsx(
                        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300',
                        done && 'bg-white text-accent',
                        now && 'bg-white/20 text-white ring-2 ring-white',
                        !done && !now && 'bg-white/10 text-white/60',
                      )}
                    >
                      {done ? <Check size={16} strokeWidth={3} /> : i + 1}
                    </span>
                    <div className="pt-1">
                      <p className={clsx('text-sm font-semibold', !done && !now && 'text-white/60')}>{step.title}</p>
                      <p className="text-xs text-white/60">{step.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <ul className="relative mt-10 space-y-2.5 text-xs text-white/80">
          <li className="flex items-center gap-2"><LockKeyhole size={14} /> Your PIN is encrypted and never stored as plain text</li>
          <li className="flex items-center gap-2"><MessageCircle size={14} /> Forgot it? Reset any time with a WhatsApp code</li>
        </ul>
      </aside>

      <main className="flex min-h-full flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-[420px]">
            {steps && (
              <div className="mb-6 flex items-center gap-1.5 md:hidden" aria-hidden="true">
                {steps.map((s, i) => (
                  <span key={s.title} className={clsx('h-1.5 flex-1 rounded-full transition-colors', i <= current ? 'bg-accent' : 'bg-divider')} />
                ))}
              </div>
            )}
            <div key={title} className="pin-step-in">
              <div
                className={clsx(
                  'mb-5 flex h-14 w-14 items-center justify-center rounded-2xl',
                  tone === 'success' && 'bg-action-soft text-action',
                  tone === 'whatsapp' && 'bg-[#25D366]/15 text-[#1DA851]',
                  tone === 'danger' && 'bg-neg/10 text-neg',
                  tone === 'accent' && 'bg-accent/10 text-accent',
                )}
              >
                <Icon size={26} />
              </div>
              <h1 id="pin-title" className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>}
              <div className="mt-7">{children}</div>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-divider px-6 py-3 text-xs text-subtle">
          <span className="truncate">
            {user?.name || user?.email ? <>Signed in as <span className="font-medium text-muted">{user.name || user.email}</span></> : 'Signed in'}
          </span>
          <div className="flex items-center gap-4">
            {footer}
            {onLogout && (
              <button type="button" onClick={onLogout} className="inline-flex items-center gap-1 font-medium text-muted transition-colors hover:text-neg">
                <LogOut size={13} /> Sign out
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

// Shared bits for the screens inside the layout.
export function PinError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-4 rounded-xl border border-neg/20 bg-neg/10 px-3.5 py-2.5 text-center text-sm font-medium text-neg">
      {children}
    </p>
  );
}

export function PrimaryButton({ busy, children, className, ...props }) {
  return (
    <button
      type="submit"
      {...props}
      disabled={busy || props.disabled}
      className={clsx(
        'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        className,
      )}
    >
      {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {children}
    </button>
  );
}

export function LinkButton({ className, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={clsx('text-sm font-semibold text-accent transition-colors hover:text-accent-hover disabled:cursor-not-allowed disabled:text-subtle', className)}
    />
  );
}

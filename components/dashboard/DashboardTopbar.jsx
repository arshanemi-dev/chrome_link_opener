'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LockKeyhole } from 'lucide-react';
import UserMenu from './UserMenu';
import { redirectToLogin } from '@/lib/authGate';

// The dark navbar: logo, a centered "Chrome Link Opener" label, and login / account.
// (Previously showed the full data/nav.js multi-tool link row.) `user` is
// undefined until the browser has read the stored session (useStoredUser) —
// an empty slot then, so neither "Log in" nor the menu flashes the wrong way.
// `onLock` (desktop app, signed in) adds a "Lock" button for the PIN screen.
export default function DashboardTopbar({ user, onLogout, onLock }) {
  return (
    <header className="sticky top-0 z-50 flex-shrink-0 border-b border-white/10 bg-footer">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 py-3 sm:gap-6">
          <Link href="/" className="flex shrink-0 items-center">
            <Image src="/images/barmeto-logo.png" alt="Barmeto" width={132} height={40} className="h-9 w-auto rounded-lg" priority />
          </Link>

          <nav className="flex min-w-0 flex-1 items-center justify-center">
            <span className="whitespace-nowrap text-sm font-semibold text-white underline underline-offset-8 decoration-2">
              Chrome Link Opener
            </span>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            {user && onLock && (
              <button
                type="button"
                onClick={onLock}
                title="Lock app (Ctrl+L)"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LockKeyhole size={15} />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}
            {user === undefined ? (
              <span aria-hidden="true" className="block h-9 w-9" />
            ) : user ? (
              <UserMenu user={user} onLogout={onLogout} />
            ) : (
              <button
                type="button"
                onClick={redirectToLogin}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-white/90"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

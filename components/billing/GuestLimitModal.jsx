'use client'

import { LogIn } from 'lucide-react'
import Modal from '@/components/admin/Modal'
import { redirectToLogin } from '@/lib/authGate'
import { GUEST_LINK_LIMIT } from '@/lib/linkOpener/linkRules'

// Signed out, links stay in this browser for free — at most GUEST_LINK_LIMIT
// of them. Shown instead of adding past that (lib/linkOpener/useLinks.js).
// `limit` = { room, wanted }.
export default function GuestLimitModal({ limit, onClose }) {
  if (!limit) return null
  const full = limit.room === 0

  return (
    <Modal open onClose={onClose} title="Free Limit Reached" maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <LogIn size={20} className="text-accent" />
        </div>
        <p className="text-sm text-muted">
          Without logging in you can keep up to <span className="font-semibold text-foreground">{GUEST_LINK_LIMIT} links</span> in this browser.{' '}
          {full
            ? 'Your list is full, so this link wasn’t added.'
            : `There’s room for ${limit.room} more, and this adds ${limit.wanted} — nothing was added.`}
        </p>
        <p className="text-xs text-subtle">Log in to keep more links on your account and open them from any device.</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            className="px-5 h-9 rounded-lg text-xs font-semibold border border-divider-light text-muted hover:bg-card-hover transition-colors"
          >
            Not now
          </button>
          <button
            onClick={redirectToLogin}
            className="px-5 h-9 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    </Modal>
  )
}

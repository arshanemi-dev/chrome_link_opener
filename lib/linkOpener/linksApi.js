'use client'

import { authFetch } from '@/lib/tokenStore'

// Signed-in store — this app's /api/link-opener/* (which forwards to the admin
// panel, where links are saved and charged). Every call resolves to
// { ok, status, data }; a billing refusal comes back as data =
// { status: 'blocked', reason, data } for BillingGateModal.

async function call(path, { method = 'GET', body } = {}) {
  try {
    const res = await authFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error — check your connection and try again.' } }
  }
}

const requestId = () => crypto.randomUUID()

export const fetchLinks = () => call('/api/link-opener/links')

// One requestId per click: a retry of the same click isn't charged twice.
export const createLinks = (links, id = requestId()) =>
  call('/api/link-opener/links', { method: 'POST', body: { links, requestId: id } })

export const patchLink = (id, link) => call(`/api/link-opener/links/${encodeURIComponent(id)}`, { method: 'PATCH', body: link })

export const deleteLinks = (ids) => call('/api/link-opener/links', { method: 'DELETE', body: { ids } })

export const renewLinks = (ids, id = requestId()) =>
  call('/api/link-opener/links/renew', { method: 'POST', body: { ids, requestId: id } })

export async function fetchWalletCoins() {
  const { ok, data } = await call('/api/auth/me')
  if (!ok) return null
  const remaining = data.walletCreditsRemaining ?? (data.walletCreditsTotal ?? 0) - (data.walletCreditsUsed ?? 0)
  return Number.isFinite(remaining) ? remaining : null
}

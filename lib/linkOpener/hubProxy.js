import { NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'
import { IS_CONNECT, proxyAdminCall, authHeaderFrom, hubUnreachable } from '@/lib/connect'

// Shared body of every /api/link-opener/* route: links of signed-in users are
// stored — and charged for — by the admin panel's own /api/link-opener/*
// (see its lib/linkOpener.js). This app only forwards the caller's own token,
// and turns a billing refusal into the { status: 'blocked', reason, data }
// shape BillingGateModal renders.

export const TOOL_SLUG = 'chrome-link-opener'
export const URL_FEATURE = 'clo-url'

// Mirrors the hub's KNOWN_REASONS — anything else is the generic 'error'.
const KNOWN_REASONS = ['access_denied', 'feature_unavailable', 'activation_required', 'insufficient_coins', 'coins_expired']

// The admin panel issued the caller's token, so in connected mode it alone
// checks it (and answers 401 for a bad or expired one) — this app only needs
// one to forward. Re-checking it here against this app's own JWT_SECRET
// refused every login whenever the two secrets differed. Local mode has no
// hub; its own check stays.
export async function forwardToHub(req, path, { method = 'GET', body } = {}) {
  const authHeader = authHeaderFrom(req)
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!IS_CONNECT) {
    const payload = await getAuthPayload(req)
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { status, data } = await proxyAdminCall(path, { method, body, authHeader })
    if (data?.billing || data?.error === 'access_denied') {
      const reason = KNOWN_REASONS.includes(data.error) ? data.error : 'error'
      return NextResponse.json(
        { status: 'blocked', reason, data: { ...data, message: data.error, toolSlug: TOOL_SLUG, featureApiIdentifier: URL_FEATURE } },
        { status: 402 },
      )
    }
    return NextResponse.json(data ?? {}, { status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: hubUnreachable(err, path) }, { status: 503 })
  }
}

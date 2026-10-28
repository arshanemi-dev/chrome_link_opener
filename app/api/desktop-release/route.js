import { NextResponse } from 'next/server'
import { IS_CONNECT, proxyAdminCall, hubUnreachable } from '@/lib/connect'

export const runtime = 'nodejs'

const PATH = '/api/link-opener/desktop-release'

// Public — the live desktop installer, from the admin panel (Settings → Desktop
// App Releases): { release: { version, fileName, size, notes, releasedAt, url } | null }.
// Deliberately outside /api/link-opener/*, which proxy.js keeps login-gated.
// Local mode has no admin panel, so no release.
export async function GET() {
  if (!IS_CONNECT) return NextResponse.json({ release: null })
  try {
    const { status, data } = await proxyAdminCall(PATH)
    return NextResponse.json(data ?? {}, { status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: hubUnreachable(err, PATH) }, { status: 503 })
  }
}

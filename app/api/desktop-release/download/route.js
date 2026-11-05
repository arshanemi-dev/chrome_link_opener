import { NextResponse } from 'next/server'
import { IS_CONNECT, proxyAdminCall, hubUnreachable } from '@/lib/connect'

export const runtime = 'nodejs'

const PATH = '/api/link-opener/desktop-release/download'

// Public — counts one Download / Update click: POST { version, source } →
// { counted, downloads }. Forwarded to the admin panel, which keeps the count
// (Settings → Desktop App Releases). This hop is server-to-server, so the
// visitor's own IP and browser go along — the admin panel only stores a hash
// of them, to skip repeat clicks by the same visitor.
export async function POST(req) {
  if (!IS_CONNECT) return NextResponse.json({ counted: false, downloads: null })
  const body = await req.json().catch(() => ({}))
  const visitorIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || ''
  try {
    const { status, data } = await proxyAdminCall(PATH, {
      method: 'POST',
      body: { version: body.version, source: body.source, visitorIp, userAgent: req.headers.get('user-agent') || '' },
      signal: AbortSignal.timeout(10_000),
    })
    return NextResponse.json(data ?? {}, { status, headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: hubUnreachable(err, PATH) }, { status: 503 })
  }
}

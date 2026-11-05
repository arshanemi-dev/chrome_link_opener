import { forwardToHub } from '@/lib/linkOpener/hubProxy'

export const runtime = 'nodejs'

// Desktop app PIN — stored and checked by the admin panel (its
// lib/linkOpenerPin.js). GET = status, PUT { pinToken, pin } = save the PIN.
export async function GET(req) {
  return forwardToHub(req, '/api/link-opener/desktop-pin')
}

export async function PUT(req) {
  const body = await req.json().catch(() => ({}))
  return forwardToHub(req, '/api/link-opener/desktop-pin', { method: 'PUT', body })
}

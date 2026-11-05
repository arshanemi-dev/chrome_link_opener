import { forwardToHub } from '@/lib/linkOpener/hubProxy'

export const runtime = 'nodejs'

// POST { pin } — checks the desktop app PIN (locks after repeated wrong tries).
export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  return forwardToHub(req, '/api/link-opener/desktop-pin/unlock', { method: 'POST', body })
}

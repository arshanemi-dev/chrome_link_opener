import { forwardToHub } from '@/lib/linkOpener/hubProxy'

export const runtime = 'nodejs'

// POST { purpose: 'setup', mobile } | { purpose: 'reset' } — sends the OTP (reset: WhatsApp).
export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  return forwardToHub(req, '/api/link-opener/desktop-pin/otp', { method: 'POST', body })
}

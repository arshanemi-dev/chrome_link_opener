import { forwardToHub } from '@/lib/linkOpener/hubProxy'

export const runtime = 'nodejs'

// POST { purpose, mobile?, otpCode } → { pinToken } for PUT /api/link-opener/desktop-pin.
export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  return forwardToHub(req, '/api/link-opener/desktop-pin/verify-otp', { method: 'POST', body })
}

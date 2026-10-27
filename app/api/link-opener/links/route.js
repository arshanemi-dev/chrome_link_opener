import { forwardToHub } from '@/lib/linkOpener/hubProxy'

export const runtime = 'nodejs'

// GET — the caller's saved links + the live per-link coin price.
export async function GET(req) {
  return forwardToHub(req, '/api/link-opener/links')
}

// POST { links: [...], requestId } — add links; the hub charges for them.
export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  return forwardToHub(req, '/api/link-opener/links', { method: 'POST', body })
}

// DELETE { ids: [...] }
export async function DELETE(req) {
  const body = await req.json().catch(() => ({}))
  return forwardToHub(req, '/api/link-opener/links', { method: 'DELETE', body })
}

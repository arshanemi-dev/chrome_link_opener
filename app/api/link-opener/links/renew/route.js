import { forwardToHub } from '@/lib/linkOpener/hubProxy'

export const runtime = 'nodejs'

// POST { ids: [...], requestId } — pay another month for expired links.
export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  return forwardToHub(req, '/api/link-opener/links/renew', { method: 'POST', body })
}

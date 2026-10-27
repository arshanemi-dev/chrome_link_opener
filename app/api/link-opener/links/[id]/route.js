import { forwardToHub } from '@/lib/linkOpener/hubProxy'

export const runtime = 'nodejs'

// PATCH — edit one saved link (free).
export async function PATCH(req, { params }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  return forwardToHub(req, `/api/link-opener/links/${encodeURIComponent(id)}`, { method: 'PATCH', body })
}

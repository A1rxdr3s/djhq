import { getJob, localRequest, prepareZip, publicJob, zipBytes } from '@/lib/set2go/jobs'
import { canUseSet2Go } from '@/lib/products/server'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: Context) {
  if (!localRequest(request) || !await canUseSet2Go()) return Response.json({ error: 'Not available.' }, { status: 404 })
  const job = getJob((await context.params).id)
  if (!job) return Response.json({ error: 'Job not found.' }, { status: 404 })
  if (new URL(request.url).searchParams.get('download') === '1') {
    if (job.status !== 'completed') return Response.json({ error: 'Export is not ready.' }, { status: 409 })
    try { return new Response(await zipBytes(job), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="set2go-export.zip"', 'Cache-Control': 'no-store' } }) }
    catch { return Response.json({ error: 'Download unavailable.' }, { status: 500 }) }
  }
  return Response.json(publicJob(job), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, context: Context) {
  if (!localRequest(request) || !request.headers.get('origin') || !await canUseSet2Go()) return Response.json({ error: 'Not available.' }, { status: 404 })
  const job = getJob((await context.params).id)
  if (!job) return Response.json({ error: 'Job not found.' }, { status: 404 })
  if (job.status !== 'ready') return Response.json({ error: 'Export is not ready.' }, { status: 409 })
  if (!prepareZip(job)) return Response.json({ error: 'Another job is running.' }, { status: 409 })
  return Response.json(publicJob(job), { status: 202 })
}

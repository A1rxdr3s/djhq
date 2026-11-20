import { createJob, localRequest, publicJob } from '@/lib/set2go/jobs'
import { canUseSet2Go } from '@/lib/products/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!localRequest(request) || !request.headers.get('origin') || !await canUseSet2Go()) return Response.json({ error: 'Not available.' }, { status: 404 })
  try { return Response.json(publicJob(await createJob(request)), { status: 202 }) }
  catch (error) { const message = error instanceof Error ? error.message : ''; return Response.json({ error: /^(Another job|Upload exceeds|Select between|Total audio|Only WAV|A file does)/.test(message) ? message : 'Upload failed. Please try again.' }, { status: 400 }) }
}

export type TrackProgressState = 'pending' | 'processing' | 'completed' | 'failed'
export type AnalysisProgress = { stage: 'preparing' | 'analyzing' | 'finalizing' | 'complete' | 'failed'; total: number; completed: number; currentTrackId: string | null; tracks: { id: string; state: TrackProgressState }[] }

export function createProgress(ids: string[]): AnalysisProgress {
  return { stage: 'preparing', total: ids.length, completed: 0, currentTrackId: null, tracks: ids.map(id => ({ id, state: 'pending' })) }
}

/** Accept only events from this child and monotonic track state transitions. */
export function applyProgress(progress: AnalysisProgress, jobId: string, event: unknown): void {
  if (!event || typeof event !== 'object') return
  const e = event as { jobId?: unknown; type?: unknown; trackId?: unknown }
  if (e.jobId !== jobId || progress.stage === 'complete' || progress.stage === 'failed') return
  if (e.type === 'track_started' && (progress.stage === 'preparing' || progress.stage === 'analyzing')) {
    const track = progress.tracks.find(item => item.id === e.trackId)
    if (track?.state === 'pending' && !progress.currentTrackId) { track.state = 'processing'; progress.currentTrackId = track.id; progress.stage = 'analyzing' }
  } else if ((e.type === 'track_completed' || e.type === 'track_failed') && progress.stage === 'analyzing') {
    const track = progress.tracks.find(item => item.id === e.trackId)
    if (track?.state === 'processing') {
      track.state = e.type === 'track_failed' ? 'failed' : 'completed'
      progress.completed = progress.tracks.filter(item => item.state === 'completed' || item.state === 'failed').length
      progress.currentTrackId = null
    }
  } else if (e.type === 'batch_finalizing' && progress.completed === progress.total && progress.total > 0) {
    progress.stage = 'finalizing'
  }
}

/** Read newline-framed JSON from a dedicated child pipe, never from CLI logs. */
export function consumeProgress(stream: import('node:stream').Readable, progress: AnalysisProgress, jobId: string): void {
  let buffer = ''
  stream.setEncoding('utf8')
  stream.on('data', (data: string) => {
    buffer += data
    if (buffer.length > 65536) { buffer = ''; return }
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      try { applyProgress(progress, jobId, JSON.parse(line)) } catch { /* malformed frame */ }
    }
  })
}

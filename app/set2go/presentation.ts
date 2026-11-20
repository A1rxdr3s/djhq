import type { AnalysisProgress } from '../../lib/set2go/progress'
export type Tier = 'accepted_clean' | 'accepted_with_warnings' | 'unresolved_needs_review' | 'failed'
export type Track = { name: string; size: number; tier?: Tier; bpm?: number | null; key?: string | null; provenance?: string | null; grid?: string; warnings?: string[]; errors?: string[] }
export type Job = { id: string; status: 'processing' | 'ready' | 'blocked' | 'failed' | 'exporting' | 'completed'; tracks: Track[]; error?: string; progress?: AnalysisProgress }

export function summarizeTracks(tracks: Track[]) {
  return {
    total: tracks.length,
    eligible: tracks.filter(track => track.tier === 'accepted_clean' || track.tier === 'accepted_with_warnings').length,
    warnings: warningCount(tracks),
    excluded: tracks.filter(track => track.tier === 'unresolved_needs_review' || track.tier === 'failed').length,
    failed: tracks.filter(track => track.tier === 'failed').length,
    complete: tracks.length > 0 && tracks.every(track => !!track.tier),
  }
}

export function warningCount(tracks: Track[]) {
  return tracks.filter(track => (track.warnings?.length ?? 0) > 0 || track.tier === 'accepted_with_warnings').length
}

export function statusLabel(tier?: Tier) {
  switch (tier) {
    case 'accepted_clean': return 'Ready to export'
    case 'accepted_with_warnings': return 'Exportable — review recommended'
    case 'unresolved_needs_review': return 'Excluded — needs review'
    case 'failed': return 'Analysis failed — excluded'
    default: return 'Analysis pending'
  }
}

export function keySource(provenance?: string | null) {
  if (provenance?.startsWith('Mixed In Key payload')) return 'Key read from file metadata (Mixed In Key).'
  if (provenance?.startsWith('embedded tag')) return 'Key read from file metadata; original source unknown.'
  if (provenance?.startsWith('audio prediction from')) return 'Key predicted by analysis; not verified.'
  if (provenance?.startsWith('user override')) return 'Key set by user override.'
  return 'Key source unavailable.'
}

export function warningSummaries(track: Track) {
  const messages = [...(track.warnings ?? []), ...(track.errors ?? [])]
  const summaries = new Set<string>()
  for (const message of messages) {
    if (/model_predicted_unstable|bar phase unstable|downbeat.*review required|downbeat\/bar origin requires review/i.test(message)) summaries.add('Beat-grid alignment may need review.')
    else if (/stored key has unknown origin/i.test(message)) summaries.add('Key was read from the audio file, but its original source is unknown.')
    else if (/no key available/i.test(message)) summaries.add('No musical key is available.')
    else summaries.add(message)
  }
  return [...summaries]
}

export function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function exclusionSummary(message: string) {
  if (/^model lost the beat for \d+ beats(?:\[path\])? in one stretch$/i.test(message.trim())) return 'Beat tracking lost synchronization during part of the track.'
  return message
}

export function includedWarningCount(tracks: Track[]) {
  return warningCount(tracks.filter(track => track.tier === 'accepted_clean' || track.tier === 'accepted_with_warnings'))
}

import { MAX_INPUT_BYTES, MAX_TRACKS } from '../../lib/set2go/limits.mjs'
import type { Locale } from '@/lib/i18n/messages'

export type SelectedFile = { name: string; size: number }
export function validateSelection<T extends SelectedFile>(current: readonly T[], incoming: readonly T[], append: boolean) {
  const files = append ? [...current, ...incoming] : [...incoming]
  const error = !files.length || files.length > MAX_TRACKS ? 'Select between 1 and 20 audio files.' : files.some(file => file.size === 0) ? 'A file does not match its audio format.' : files.some(file => !/\.(wav|aif|aiff|flac)$/i.test(file.name)) ? 'Only WAV, AIFF and FLAC files are supported.' : files.reduce((sum, file) => sum + file.size, 0) > MAX_INPUT_BYTES ? 'Total audio size must be at most 200 MiB.' : ''
  return { files: error ? (append ? [...current] : []) : files, error }
}
export function removeSelection<T>(files: readonly T[], index: number): T[] { return files.filter((_, i) => i !== index) }
export function selectionSize(files: readonly SelectedFile[]) { return files.reduce((sum, file) => sum + file.size, 0) }
export function analyzeLabel(locale: Locale, count: number) { return locale === 'es' ? `Analizar ${count} ${count === 1 ? 'pista' : 'pistas'}` : `Analyze ${count} ${count === 1 ? 'track' : 'tracks'}` }

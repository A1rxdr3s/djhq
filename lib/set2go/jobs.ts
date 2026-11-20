import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'
import { MAX_INPUT_BYTES, MAX_TRACKS, MULTIPART_OVERHEAD_BYTES } from './limits.mjs'
import { consumeProgress, createProgress, type AnalysisProgress } from './progress'

type Tier = 'accepted_clean' | 'accepted_with_warnings' | 'unresolved_needs_review' | 'failed'
type Track = { name: string; size: number; stored: string; tier?: Tier; bpm?: number | null; key?: string | null; provenance?: string | null; grid?: string; warnings?: string[]; errors?: string[] }
type Job = { id: string; dir: string; created: number; status: 'processing' | 'ready' | 'blocked' | 'failed' | 'exporting' | 'completed'; tracks: Track[]; error?: string; progress?: AnalysisProgress }
type ContractTrack = { bpm: { value: number | null }; key: { effective: { camelot?: string } | null; provenance: string | null }; grid: { status: string }; review_reasons: { reason: string }[]; failures: Record<string, string>; export_eligibility: { eligible: boolean; tier: Tier; exported: boolean; excluded: boolean; warning_reasons: string[]; blocking_reasons: string[] } }
type Report = { contract_version: string; tracks: Record<string, ContractTrack> }

const state = globalThis as typeof globalThis & { set2goJobs?: Map<string, Job>; set2goUploading?: boolean }
const jobs = state.set2goJobs ??= new Map<string, Job>()
const ttl = 24 * 60 * 60 * 1000

export function localRequest(request: Request) {
  if (process.env.NODE_ENV !== 'development') return false
  const url = new URL(request.url)
  const host = request.headers.get('host')
  if (!host) return false
  let requestOrigin: URL
  try { requestOrigin = new URL(`${url.protocol}//${host}`) } catch { return false }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(requestOrigin.hostname)) return false
  const origin = request.headers.get('origin')
  return !origin || origin === requestOrigin.origin
}

export function publicJob(job: Job) {
  return { id: job.id, status: job.status, error: job.error, progress: job.progress, tracks: job.tracks.map(track => ({ name: track.name, size: track.size, tier: track.tier, bpm: track.bpm, key: track.key, provenance: track.provenance, grid: track.grid, warnings: track.warnings, errors: track.errors })) }
}

export function getJob(id: string) { return jobs.get(id) }

async function cleanup() {
  for (const [id, job] of jobs) {
    if (Date.now() - job.created > ttl && !['processing', 'exporting'].includes(job.status)) {
      jobs.delete(id)
      await fs.rm(job.dir, { recursive: true, force: true })
    }
  }
}

function scheduleCleanup(job: Job, delay = ttl) {
  const timer = setTimeout(() => {
    if (['processing', 'exporting'].includes(job.status)) scheduleCleanup(job, 60 * 60 * 1000)
    else if (jobs.delete(job.id)) void fs.rm(job.dir, { recursive: true, force: true }).catch(() => {})
  }, delay)
  timer.unref()
}

function run(command: string, args: string[], cwd: string, env = process.env, job?: Job): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, shell: false, detached: true, stdio: ['ignore', 'pipe', 'pipe', 'pipe'] })
    if (job?.progress && child.stdio[3] instanceof Readable) consumeProgress(child.stdio[3], job.progress, job.id)
    let output = ''
    for (const stream of [child.stdout, child.stderr]) stream?.on('data', (data: Buffer) => { if (output.length < 1024 * 1024) output += data.toString().slice(0, 1024 * 1024 - output.length) })
    const timer = setTimeout(() => { if (child.pid) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } } }, 30 * 60 * 1000)
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.on('close', (code) => {
      clearTimeout(timer)
      void fs.writeFile(path.join(cwd, 'diagnostics.log'), output, { mode: 0o600 }).catch(() => {}).then(() => resolve(code ?? -1))
    })
  })
}

function validAudio(bytes: Buffer, extension: string) {
  if (extension === '.flac') return bytes.subarray(0, 4).toString() === 'fLaC'
  if (extension === '.wav') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE'
  return bytes.subarray(0, 4).toString() === 'FORM' && ['AIFF', 'AIFC'].includes(bytes.subarray(8, 12).toString())
}

export async function createJob(request: Request): Promise<Job> {
  if (state.set2goUploading || [...jobs.values()].some(job => ['processing', 'exporting'].includes(job.status))) throw new Error('Another job is running. Please wait for it to finish.')
  state.set2goUploading = true
  try { return await createJobInner(request) } finally { state.set2goUploading = false }
}

async function createJobInner(request: Request): Promise<Job> {
  await cleanup()
  const length = Number(request.headers.get('content-length'))
  if (!length || length > MAX_INPUT_BYTES + MULTIPART_OVERHEAD_BYTES) throw new Error('Upload exceeds the 200 MiB limit or has no content length.')
  const form = await request.formData()
  const files = form.getAll('files')
  if (!files.length || files.length > MAX_TRACKS || files.some(file => !(file instanceof File))) throw new Error('Select between 1 and 20 audio files.')
  if (files.reduce((sum, file) => sum + (file as File).size, 0) > MAX_INPUT_BYTES) throw new Error('Total audio size must be at most 200 MiB.')
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'set2go-'))
  const job: Job = { id: randomUUID(), dir, created: Date.now(), status: 'processing', tracks: [] }
  jobs.set(job.id, job)
  scheduleCleanup(job)
  try {
    for (const [index, item] of files.entries()) {
      const file = item as File
      const extension = path.extname(file.name).toLowerCase()
      if (!['.wav', '.aif', '.aiff', '.flac'].includes(extension)) throw new Error('Only WAV, AIFF and FLAC files are supported.')
      const bytes = Buffer.from(await file.slice(0, 12).arrayBuffer())
      if (bytes.length < 12 || !validAudio(bytes, extension)) throw new Error('A file does not match its audio format.')
      const stored = `track-${index + 1}${extension}`
      await pipeline(Readable.fromWeb(file.stream() as import('node:stream/web').ReadableStream), createWriteStream(path.join(dir, stored), { flags: 'wx', mode: 0o600 }))
      job.tracks.push({ name: file.name.split(/[\\/]/).pop()!.slice(0, 255), size: file.size, stored })
    }
    job.progress = createProgress(job.tracks.map(track => track.stored))
    void analyse(job, form.get('gridcheck') === 'true')
    return job
  } catch (error) {
    jobs.delete(job.id)
    await fs.rm(dir, { recursive: true, force: true })
    throw error
  }
}

async function analyse(job: Job, gridcheck: boolean) {
  try {
    const root = process.cwd()
    const engine = path.join(root, 'services/set2go')
    const python = process.env.SET2GO_PYTHON || path.join(os.homedir(), 'Developer/Set2Go/.venv/bin/python')
    const args = [path.join(engine, 'scripts/analysis_key_export.py'), path.join(job.dir, 'export'), ...job.tracks.map(track => path.join(job.dir, track.stored)), '--sidecar', path.join(job.dir, 'sidecar.json'), '--on-unresolved', 'exclude', ...(gridcheck ? ['--gridcheck'] : [])]
    const code = await run(python, args, job.dir, { ...process.env, PYTHONPATH: path.join(engine, 'src'), SET2GO_PROGRESS_FD: '3', SET2GO_JOB_ID: job.id }, job)
    let report: Report | undefined
    try { report = JSON.parse(await fs.readFile(path.join(job.dir, 'export_ENGINE_REPORT.json'), 'utf8')) as Report } catch { /* no contract was produced */ }
    if (!report || report.contract_version !== '1.0' || !report.tracks) throw new Error('Analysis could not produce a valid result. Check the local engine configuration and audio files.')
    interpretReport(job.tracks, report, job.dir)
    const eligible = job.tracks.filter(track => track.tier === 'accepted_clean' || track.tier === 'accepted_with_warnings')
    if (!eligible.length) { if (job.progress) job.progress.stage = 'complete'; job.status = 'blocked'; job.error = 'No eligible tracks remain. Review the excluded tracks.'; return }
    if (code !== 0) throw new Error('The engine could not prepare the export. Check the audio and local engine configuration.')
    await fs.access(path.join(job.dir, 'export/PIONEER/rekordbox/export.pdb'))
    if (job.progress) job.progress.stage = 'complete'
    job.status = 'ready'
  } catch (error) {
    if (job.progress) {
      job.progress.currentTrackId = null
      job.progress.stage = 'failed'
    }
    job.status = 'failed'
    job.error = error instanceof Error && error.message.startsWith('Analysis ') ? error.message : 'The local engine could not complete this job. Check its configuration and try again.'
  }
}

export function interpretReport(tracks: Track[], report: Report, directory: string) {
  if (report.contract_version !== '1.0' || !report.tracks || Object.keys(report.tracks).length !== tracks.length) throw new Error('Analysis returned an incomplete result.')
  for (const track of tracks) {
    const result = report.tracks[track.stored]
    const eligibility = result?.export_eligibility
    if (!eligibility || !['accepted_clean', 'accepted_with_warnings', 'unresolved_needs_review', 'failed'].includes(eligibility.tier)) throw new Error('Analysis returned an incomplete result.')
    const accepted = ['accepted_clean', 'accepted_with_warnings'].includes(eligibility.tier)
    if (eligibility.eligible !== accepted || eligibility.excluded !== !accepted || eligibility.exported !== accepted) throw new Error('Analysis returned an inconsistent export policy.')
    track.tier = eligibility.tier
    track.bpm = result.bpm.value
    track.key = result.key.effective?.camelot ?? null
    track.grid = result.grid.status
    const clean = (value: string) => value.replaceAll(directory, '[local job]').replace(/(?:\/[^\s,:;]+)+/g, '[path]')
    track.provenance = result.key.provenance ? clean(result.key.provenance) : null
    track.warnings = [...new Set([...eligibility.warning_reasons, ...result.review_reasons.map(reason => reason.reason)])].map(clean)
    track.errors = [...eligibility.blocking_reasons.map(clean), ...Object.keys(result.failures).map(stage => `${stage} analysis failed`)]
  }
}

export function prepareZip(job: Job) {
  if (job.status !== 'ready' || state.set2goUploading || [...jobs.values()].some(other => other !== job && ['processing', 'exporting'].includes(other.status))) return false
  job.status = 'exporting'
  void makeZip(job)
  return true
}

async function makeZip(job: Job) {
  try {
    const code = await run('/usr/bin/zip', ['-q', '-r', path.join(job.dir, 'set2go-export.zip'), '.'], path.join(job.dir, 'export'))
    if (code !== 0) throw new Error('ZIP creation failed')
    job.status = 'completed'
  } catch { job.status = 'failed'; job.error = 'Could not create the ZIP archive.' }
}

export async function zipBytes(job: Job) { return fs.readFile(path.join(job.dir, 'set2go-export.zip')) }

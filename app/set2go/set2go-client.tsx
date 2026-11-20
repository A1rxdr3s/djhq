'use client'

import { useEffect, useState } from 'react'
import CloudUpload from './cloud-upload'
import progressStyles from './progress.module.css'
import type { Locale } from '@/lib/i18n/messages'
import { localeCookie } from '@/lib/i18n/locale'
import LanguageSwitch from '../language-switch'
import { text, diagnostic } from '@/lib/i18n/set2go'
import { visibleDestinations, isAvailableDestination, type Destination } from './destinations'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDownToLine, ArrowRight, Check, ChevronDown, Disc3, TriangleAlert, FileAudio, FolderOpen, Upload, X } from 'lucide-react'
import { analyzeLabel, removeSelection, selectionSize, validateSelection } from './selection'
import { exclusionSummary, formatSize, includedWarningCount, keySource, summarizeTracks, warningCount, warningSummaries, type Job, type Track } from './presentation'

const button = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#f26a36] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.01em] text-[#0b0d0e] transition-colors hover:bg-[#ff8253] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f26a36] disabled:cursor-not-allowed disabled:bg-[#262b2d] disabled:text-[#b8bdbe] disabled:opacity-100'
const statusLabels: Record<Job['status'], string> = { processing: 'Analyzing tracks', ready: 'Ready to generate', blocked: 'Export unavailable', failed: 'Job failed', exporting: 'Generating ZIP', completed: 'Export complete' }
const destinationMarks: Partial<Record<Destination['id'], { src: string; width: number; height: number }>> = {
  rekordbox: { src: '/images/set2go/destinations/rekordbox.svg', width: 542, height: 75 },
  'engine-dj': { src: '/images/set2go/destinations/engine-dj.svg', width: 600, height: 91 },
  'serato-dj': { src: '/images/set2go/destinations/serato.svg', width: 480, height: 120 },
}

function TrackResult({ track, jobFailed, locale }: { track: Track; jobFailed: boolean; locale: Locale }) {
  const d = (value: string) => diagnostic(locale, value)
  const t = (key: import('@/lib/i18n/set2go').Set2GoKey) => text(locale, key)
  const summaries = warningSummaries(track)
  const eligible = track.tier === 'accepted_clean' || track.tier === 'accepted_with_warnings'
  const status = track.tier === 'failed' ? 'Analysis failed — excluded' : track.tier ? (eligible ? 'Eligible for export' : 'Not eligible for export') : (jobFailed ? 'Analysis unavailable' : 'Analysis pending')
  return <li className="border-b border-white/10 py-3">
    <div className="grid min-w-0 gap-2 text-sm xl:grid-cols-[minmax(0,3fr)_64px_75px_minmax(110px,1fr)_minmax(120px,1fr)] xl:gap-3">
      <span className="min-w-0 truncate font-semibold" title={track.name}>{track.name}</span>
      <span className="tabular-nums"><span className="sr-only">BPM: </span><span aria-hidden="true" className="mr-2 text-xs text-[#9ca3a6] xl:hidden">BPM</span>{track.bpm == null ? '—' : Number.isFinite(track.bpm) && track.bpm > 0 ? track.bpm : t('Invalid')}</span>
      <span><span className="sr-only">{t('Key')}: </span><span aria-hidden="true" className="mr-2 text-xs text-[#9ca3a6] xl:hidden">{t('Key')}</span>{track.key ?? '—'}</span>
      <span className={eligible ? "font-medium text-[#f2f1ed]" : "font-medium text-[#d4b4a6]"}><span className="sr-only">{t('Status')}: </span>{d(status)}</span>
      <span className="flex items-center gap-2 text-[#c8cbcb]"><span className="sr-only">{t('Warnings')}: </span>{(track.warnings?.length || track.tier === 'accepted_with_warnings') ? <><TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />{t('Review recommended')}</> : t('No warnings')}</span>
    </div>
    {track.tier && !eligible && track.errors?.[0] && <p className="mt-2 break-words text-xs leading-5 text-[#c8cbcb]">{t('Blocking reason')}: {d(exclusionSummary(track.errors[0]))}</p>}
    {track.tier && <details className="group text-sm text-[#9ca3a6]"><summary className="flex min-h-11 w-fit cursor-pointer items-center gap-1 font-medium text-[#d4d6d4] focus-visible:outline-2 focus-visible:outline-[#f26a36]">{t('Technical details')} <ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" /></summary><div className="space-y-2 break-words bg-black/20 p-3 leading-5"><p>{t('Tempo')}: {track.bpm ?? d('Unavailable')}</p><p>{t('Engine classification')}: {track.tier}</p><p>{t('Grid status')}: {track.grid ?? d('Unavailable')}</p><p>{d(keySource(track.provenance))}</p><p>{t('Key provenance')}: {track.provenance ? d(track.provenance) : d('Unavailable')}</p>{summaries.map((message, index) => <p key={`summary-${index}`}>{d(message)}</p>)}{(track.warnings ?? []).map((warning, index) => <p key={`warning-${index}`}>{t('Review')}: {d(warning)}</p>)}{(track.errors ?? []).map((error, index) => <p key={`error-${index}`}>{t('Blocking reason')}: {d(error)}</p>)}</div></details>}
  </li>
}

export default function Set2GoClient({ initialLocale, cloudEnabled = false }: { initialLocale: Locale; cloudEnabled?: boolean }) {
  const [locale, setLocale] = useState(initialLocale)
  const [cloudMode, setCloudMode] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [destination, setDestination] = useState<Destination['id'] | null>(null)
  const [choice, setChoice] = useState<Destination['id'] | null>(null)
  const [exportPending, setExportPending] = useState(false)
  const t = (key: import('@/lib/i18n/set2go').Set2GoKey) => text(locale, key)
  const d = (value: string) => diagnostic(locale, value)
  function changeLocale(next: Locale) { document.cookie = localeCookie(next); setLocale(next) }
  useEffect(() => { const previous = document.documentElement.lang; document.documentElement.lang = locale; return () => { document.documentElement.lang = previous } }, [locale])
  const [files, setFiles] = useState<File[]>([])
  const [gridcheck, setGridcheck] = useState(false)
  const [analysedGridcheck, setAnalysedGridcheck] = useState<boolean | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const busy = uploading || exportPending || job?.status === 'processing' || job?.status === 'exporting'
  const summary = job ? summarizeTracks(job.tracks) : null
  const totalSize = selectionSize(files)
  const jobId = job?.id
  const jobStatus = job?.status

  useEffect(() => {
    if (!jobId || !jobStatus || !['processing', 'exporting'].includes(jobStatus)) return
    let active = true
    let polling = false
    const timer = window.setInterval(async () => {
      if (polling) return
      polling = true
      try {
        const response = await fetch(`/api/set2go/jobs/${jobId}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Job status unavailable. The local server may have restarted.')
        const updated: Job = await response.json()
        if (active) setJob(updated)
      } catch (err) { if (active) { setError(err instanceof Error ? err.message : 'Could not check job status.'); setJob(null) } }
      finally { polling = false }
    }, 2000)
    return () => { active = false; window.clearInterval(timer) }
  }, [jobId, jobStatus])

  function select(selected: FileList | File[], append = false) { if (busy || job) return; const result = validateSelection(files, Array.from(selected), append); setFiles(result.files); setError(result.error) }
  async function analyse() {
    if (job && !window.confirm(t('Reanalyze and clear the current results?'))) return
    setUploading(true); setError(''); setJob(null); setAnalysedGridcheck(null)
    try {
      const form = new FormData()
      files.forEach(file => form.append('files', file))
      form.append('gridcheck', String(gridcheck))
      const response = await fetch('/api/set2go/jobs', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setAnalysedGridcheck(gridcheck)
      setJob(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.') }
    finally { setUploading(false) }
  }
  async function exportZip() {
    if (!job) return
    setExportPending(true)
    setError('')
    try {
      const response = await fetch(`/api/set2go/jobs/${job.id}`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setJob(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Export failed.') }
    finally { setExportPending(false) }
  }

  return (
    <main style={{ fontFamily: 'var(--font-inter), Arial, sans-serif' }} className="min-h-screen bg-[#0b0d0e] px-4 py-6 text-[#f2f1ed] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3a6] sm:mb-7"><span className="flex min-w-0 items-center gap-4"><Link href="/hq" aria-label={t('All products')}><Image src="/images/djhq/djhq-wordmark.svg" alt="" width={2048} height={430} className="h-auto w-24" unoptimized /></Link><span className="text-[#565c5f]">/</span> <Image src="/images/set2go/set2go-wordmark-dark.svg" alt="Set2Go" width={1205} height={300} className="h-auto w-20" unoptimized /></span><div className="flex flex-wrap items-center justify-end gap-x-4"><Link href="/hq" className="rounded-sm text-[#d4d6d4] underline decoration-[#f26a36] underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f26a36]">{t('All products')}</Link><span className="text-right text-[10px] tracking-[0.14em]">{t("Local workspace")}</span><LanguageSwitch locale={locale} onChange={changeLocale} /></div></header>
        {!destination && <section aria-labelledby="destination-heading" className="py-5 sm:py-9">
          <h1 id="destination-heading" className="text-4xl font-black leading-[1.05] tracking-[-0.05em] sm:text-5xl">{t('Choose your destination.')}</h1>
          <p className="mt-4 text-base leading-6 text-[#9ca3a6]">{t('How do you want to prepare your music?')}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleDestinations.map(item => { const mark = destinationMarks[item.id]; const selected = choice === item.id; return <button key={item.id} type="button" disabled={!item.available} aria-pressed={item.available ? selected : undefined} onClick={() => { if (isAvailableDestination(item.id)) setChoice(item.id) }} className={`flex min-w-0 flex-col rounded-sm border p-4 text-left md:min-h-44 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f26a36] ${!item.available ? 'cursor-not-allowed border-white/[0.06] bg-[#0d0f10] text-[#aeb5b7]' : selected ? 'border-[#f26a36] bg-[#1a1d1f] text-[#f2f1ed]' : 'border-white/25 bg-[#111314] text-[#f2f1ed] hover:border-[#f26a36]'}`}>
              <span className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2"><span className="flex h-8 min-w-0 items-center">{mark ? <Image src={mark.src} alt="" width={mark.width} height={mark.height} unoptimized className={`h-auto max-h-7 w-auto max-w-[120px] object-contain object-left ${item.available ? '' : 'opacity-60'}`} /> : <FolderOpen aria-hidden="true" size={26} strokeWidth={1.5} className="text-[#8f979a]" />}</span><span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${item.available ? '' : 'text-[#9ca3a6]'}`}>{t(selected ? 'Selected' : item.status)}{selected && <Check aria-hidden="true" size={14} className="ml-2 inline-block text-[#f26a36]" />}</span></span>
              <span className="mt-4 block text-base font-bold leading-5 tracking-[-0.02em]">{t(item.name)}</span><span className={`mt-2 block text-sm leading-5 ${item.available ? 'text-[#b8bdbe]' : 'text-[#9ca3a6]'}`}>{t(item.description)}</span>
            </button> })}
          </div>
          {(files.length > 0 || job || gridcheck) && <p className="mt-5 text-sm text-[#9ca3a6]">{t('Your current work is preserved.')}</p>}
          <button type="button" className={`${button} mt-7`} disabled={!choice || !isAvailableDestination(choice)} onClick={() => { if (choice && isAvailableDestination(choice)) setDestination(choice) }}>{t('Continue')} <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
        </section>}
        <div hidden={!destination}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1"><div className="flex min-w-0 flex-wrap items-center gap-3"><Image src="/images/set2go/destinations/rekordbox.svg" alt="" width={542} height={75} unoptimized className="h-auto w-24 max-w-full" /><span className="text-sm font-semibold text-[#f2f1ed]">{t('Rekordbox / Pioneer DJ')}</span></div><button type="button" disabled={!!busy} onClick={() => { if (!busy) setDestination(null) }} className="min-h-11 text-sm font-semibold text-[#d4d6d4] underline decoration-[#f26a36] underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f26a36] disabled:cursor-not-allowed disabled:text-[#737a7d]">{t('Change destination')}</button></div><div className="mb-6 max-w-2xl"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f26a36]">{t("Your music, prepared")}</p><h1 className="text-4xl font-black leading-[1.05] tracking-[-0.05em] sm:text-5xl">{t("Get your tracks ready.")}</h1><p className="mt-4 text-sm leading-6 text-[#9ca3a6] sm:text-base">{t("Analyze your music, review the results, and prepare your export.")}</p></div>
        {cloudEnabled && <div className="mb-5 flex flex-wrap gap-4"><button type="button" aria-pressed={!cloudMode} disabled={!!busy} onClick={()=>setCloudMode(false)} className="min-h-11 text-sm font-semibold underline decoration-[#f26a36] underline-offset-4">{t('Local analysis')}</button><button type="button" aria-pressed={cloudMode} disabled={!!busy} onClick={()=>setCloudMode(true)} className="min-h-11 text-sm font-semibold underline decoration-[#f26a36] underline-offset-4">{t('Cloud staging · development')}</button></div>}
        {cloudEnabled && <div hidden={!cloudMode}><CloudUpload locale={locale}/></div>}
        <div hidden={cloudMode}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-8">
          <div className="min-w-0 space-y-5">
            <section aria-labelledby="select-heading" className="border-t border-white/20 pt-6 sm:pt-6">
              <div className="mb-5 flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3a6]">{t("01 / Your music")}</p><h2 id="select-heading" className="text-lg font-semibold">{t("Select your tracks")}</h2></div>{files.length > 0 && <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-[#d4d6d4]">{files.length} {t('selected')} · {formatSize(totalSize)}</span>}</div>
              <label onDragOver={event => { event.preventDefault(); if (!busy && !job) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy && !job) select(event.dataTransfer.files, files.length > 0) }} className={`flex flex-col items-center justify-center rounded-sm border border-dashed border-[#565c5f] px-4 py-6 text-center focus-within:border-[#f26a36] focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[#f26a36] ${files.length ? 'min-h-28' : 'min-h-44'} ${busy || job ? 'cursor-not-allowed opacity-60' : dragging ? 'cursor-copy border-[#f26a36]' : 'cursor-pointer hover:border-[#f26a36]'}`}>
                <Upload aria-hidden="true" className="mb-3 h-5 w-5 text-[#f26a36]" /><span className="text-sm font-medium">{t(dragging ? 'Drag audio files here' : files.length ? 'Add tracks' : 'Drop your tracks here')} {!files.length && <> <span className="text-[#9ca3a6]">{t("or")}</span> <span className="text-[#f26a36]">{t("choose files")}</span></>}</span><span className="mt-2 text-xs text-[#9ca3a6]">{t("WAV, AIFF or FLAC · 20 tracks max · 200 MiB total")}</span>
                <input className="sr-only" type="file" accept=".wav,.aif,.aiff,.flac" multiple disabled={!!busy || !!job} onChange={event => { if (event.target.files?.length) select(event.target.files, files.length > 0); event.target.value = '' }} />
              </label>
              {job && <div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-xs leading-5 text-[#9ca3a6]">{t('Track selection is locked while results are available.')}</p><button type="button" disabled={!!busy} onClick={() => { if (window.confirm(t('Start a new selection? Current results will be cleared.'))) { setFiles([]); setJob(null); setAnalysedGridcheck(null); setError('') } }} className="min-h-11 text-sm text-[#f2f1ed] underline decoration-[#f26a36] underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#f26a36] disabled:cursor-not-allowed disabled:text-[#737a7d]">{t('Start new selection')}</button></div>}
              <p className="sr-only" role="status" aria-live="polite">{files.length} {t('selected')} · {formatSize(totalSize)}</p>
              {files.length > 0 && !job && <ul aria-label={t('Selected tracks')} className="mt-2 divide-y divide-white/10">{files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex min-w-0 items-center gap-3 py-2 text-sm"><FileAudio aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9ca3a6]" /><span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span><span className="shrink-0 text-xs tabular-nums text-[#9ca3a6]">{formatSize(file.size)}</span><button type="button" disabled={!!busy} aria-label={`${t('Remove track')}: ${file.name}`} onClick={() => { if (!busy && !job) { setFiles(current => removeSelection(current, index)); setError('') } }} className="flex h-11 w-11 shrink-0 items-center justify-center text-[#b8bdbe] hover:text-[#f2f1ed] focus-visible:outline-2 focus-visible:outline-[#f26a36] disabled:cursor-not-allowed disabled:text-[#737a7d]"><X size={18} aria-hidden="true" /></button></li>)}</ul>}

            </section>

            <section aria-labelledby="results-heading" className="border-t border-white/20 pt-6 sm:pt-6">
              <div className="mb-5"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3a6]">{t("02 / Your analysis")}</p><h2 id="results-heading" className="text-lg font-semibold">{t("Analyze")}</h2></div>
              <details className="group border-t border-white/10"><summary className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-[#d4d6d4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f26a36]">{t("Advanced options")} <ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" /></summary><div className="pb-3"><label className="flex items-start gap-3 text-sm font-medium text-[#f2f1ed]"><input type="checkbox" checked={gridcheck} disabled={!!busy} onChange={event => setGridcheck(event.target.checked)} className="mt-1 accent-[#f26a36]" /><span>{t('Experimental gridcheck')} <span className="mt-1 block text-xs font-normal leading-5 text-[#9ca3a6]">{t("Optional. Recovered grids require manual review and have not been physically validated.")}</span></span></label>
                {job && analysedGridcheck !== null && <p className="ml-7 mt-3 text-xs leading-5 text-[#c8cbcb]">{t(analysedGridcheck ? 'Current results: gridcheck on.' : 'Current results: gridcheck off.')}{gridcheck !== analysedGridcheck && t(' Analyze again to apply the new setting.')}</p>}
              </div></details>
              <div className="mt-4 flex flex-wrap items-center gap-4"><button className={job && !busy ? "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#f2f1ed] underline decoration-[#f26a36] underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#f26a36]" : button} disabled={!files.length || !!busy} onClick={analyse}>{uploading ? t('Uploading files') : job?.status === 'processing' ? t('Analyzing tracks') : job ? t('Analyze again') : files.length ? analyzeLabel(locale, files.length) : t('Analyze tracks')} <ArrowRight aria-hidden="true" className="h-4 w-4" /></button><span className="text-xs leading-5 text-[#9ca3a6]">{t("Files are sent to the local development server for processing.")}</span></div>
              {(uploading || job?.status === 'processing') && <div className="mt-5 text-sm text-[#b8bdbe]">
                <div role="status" aria-live="polite" className="flex justify-between gap-4"><span>{uploading ? t('Uploading files') : job?.progress?.stage === 'finalizing' ? t('Finalizing analysis and preparing export') : job?.progress?.stage === 'analyzing' ? t('Analyzing tracks') : job?.progress ? t('Preparing analysis') : t('Analysis is running. Track-level progress is unavailable.')}</span>{!uploading && job?.progress?.stage === 'analyzing' && <span className="shrink-0 tabular-nums">{job.progress.completed} / {job.progress.total}<span className="sr-only"> {t('tracks processed')}</span></span>}</div>
                <progress className={`mt-3 h-2 w-full ${!uploading && job?.progress?.stage === 'analyzing' ? progressStyles.determinate : 'accent-[#f26a36]'}`} aria-label={t(uploading ? 'Uploading files' : 'Analyzing tracks')} {...(job?.progress?.stage === 'analyzing' && !uploading ? { value: job.progress.completed, max: job.progress.total } : {})} />
                {job?.progress && <ul className="mt-3 space-y-2" aria-label={t('Analyzing tracks')}>{job.progress.tracks.map((track, index) => <li key={track.id} className="flex min-w-0 justify-between gap-3"><span className="min-w-0 truncate" title={job.tracks[index]?.name}>{job.tracks[index]?.name}</span><span className="shrink-0">{t(track.state === 'processing' ? 'Processing' : track.state === 'completed' ? 'Processed' : track.state === 'failed' ? 'Processing failed' : 'Pending')}</span></li>)}</ul>}
              </div>}
              <h3 className="mt-8 border-t border-white/10 pt-6 text-base font-semibold">{t('Results')}</h3>
              {job && job.status !== 'processing' && <>
                {summary?.complete && <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">{[['Total', summary.total], ['Export eligible', summary.eligible], ['Tracks with warnings', warningCount(job?.tracks ?? [])], ['Excluded', summary.excluded], ['Failed', summary.failed]].map(([label, value]) => <div key={label} className="border-t border-white/10 py-3"><p className="text-lg font-semibold tabular-nums">{value}</p><p className="mt-1 text-[11px] leading-4 text-[#9ca3a6]">{d(String(label))}</p></div>)}</div>}
                {!summary?.complete && job.status === 'failed' && <p className="mb-4 text-sm text-[#b8bdbe]">{t('Analysis did not return results for every track.')}</p>}
                {summary?.complete && <p className="mb-3 text-xs text-[#9ca3a6]">{t('Warnings may include exportable or excluded tracks.')}</p>}
                <div aria-hidden="true" className="hidden border-b border-white/20 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9ca3a6] xl:grid xl:grid-cols-[minmax(0,3fr)_64px_75px_minmax(110px,1fr)_minmax(120px,1fr)] xl:gap-3"><span>{t('Track')}</span><span>BPM</span><span>{t('Key')}</span><span>{t('Status')}</span><span>{t('Warnings')}</span></div><ul aria-label={t('Analysis results')} className="divide-y-0">{job.tracks.map((track, index) => <TrackResult key={`${job.id}-${index}`} track={track} jobFailed={job.status === 'failed'} locale={locale} />)}</ul>
              </>}
            </section>
          </div>

          <aside aria-labelledby="export-heading" className="border-t border-white/20 pt-7 lg:sticky lg:top-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3a6]">{t("Export")}</p><h2 id="export-heading" className="text-lg font-semibold">{t("Review & export")}</h2>
            <div aria-live="polite" role="status" className="mt-5 border-t border-white/10 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9ca3a6]">{t("Status")}</p><p className="mt-2 text-sm font-semibold">{d(uploading ? 'Uploading files' : job ? statusLabels[job.status] : files.length ? 'Ready to analyze' : 'Waiting for tracks')}</p>{(error || job?.error) && <p className="mt-3 text-sm leading-6 text-[#ffb3a2]">{d(error || job?.error || '')}</p>}</div>
            {summary?.complete && <div className="mt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#9ca3a6]">{t(job?.status === 'completed' ? 'Export contents' : 'What will be included')}</p><dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-[#b8bdbe]">{t(job?.status === 'completed' ? 'Exported tracks' : 'Eligible tracks')}</dt><dd className="font-semibold tabular-nums">{summary.eligible}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#b8bdbe]">{t("Excluded tracks")}</dt><dd className="font-semibold tabular-nums">{summary.excluded}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#b8bdbe]">{t("Included tracks with warnings")}</dt><dd className="font-semibold tabular-nums">{includedWarningCount(job?.tracks ?? [])}</dd></div></dl><p className="mt-4 text-xs leading-5 text-[#9ca3a6]">{t(job?.tracks.some(track => (track.tier === 'accepted_clean' || track.tier === 'accepted_with_warnings') && (track.tier === 'accepted_with_warnings' || !!track.warnings?.length)) ? 'Eligible tracks with warnings are included; review their details before use.' : 'Eligible tracks are included. Excluded tracks are left out.')}</p></div>}
            {job && !summary?.complete && <p className="mt-5 text-sm leading-6 text-[#9ca3a6]">{t("Analyze your tracks to see what can be included.")}</p>}
            {job?.status === 'exporting' && <div role="status" className="mt-4 text-sm text-[#9ca3a6]"><p>{t('Preparing ZIP. Progress is unavailable.')}</p><progress aria-label={t('Generating ZIP')} className="mt-2 h-2 w-full accent-[#f26a36]" /></div>}
            {job && <div className="mt-6">{job.status === 'completed' ? <a className={`${button} w-full`} href={`/api/set2go/jobs/${job.id}?download=1`}><ArrowDownToLine aria-hidden="true" className="h-4 w-4" /> {t('Download ZIP')}</a> : <button className={`${button} w-full`} disabled={job?.status !== 'ready'} onClick={exportZip}>{t(job.status === 'exporting' ? 'Generating ZIP…' : 'Generate export')}</button>}</div>}
            <div className="mt-5 flex items-start gap-2 border-t border-white/[0.08] pt-5 text-xs leading-5 text-[#9ca3a6]"><Disc3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>{t("Export generated locally. USB transfer and CDJ compatibility have not been validated by this operation.")}</p></div>
          </aside>
        </div>
        </div>
        </div>
      </div>
    </main>
  )
}

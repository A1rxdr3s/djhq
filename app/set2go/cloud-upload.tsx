'use client'
import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n/messages'
import { text } from '@/lib/i18n/set2go'
import { uploadFileParts } from '@/lib/set2go/cloud/browser-upload.mjs'
import progressStyles from './progress.module.css'

type Row = { id?: string; name: string; size: number; state: string; bytes: number }
const actionClass = 'min-h-11 rounded-full border border-[#f26a36] px-5 py-2 text-sm font-semibold text-[#f2f1ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f26a36] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#9ca3a6]'
async function api(body: object, signal?: AbortSignal) {
  const r = await fetch('/api/set2go/cloud',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'})
  const result = await r.json()
  if(!r.ok) throw Object.assign(new Error('Cloud upload operation failed.'),{retryable:r.status===409 || r.status>=500})
  return result
}
export default function CloudUpload({locale}:{locale:Locale}) {
  const t=(key: import('@/lib/i18n/set2go').Set2GoKey)=>text(locale,key)
  const [files,setFiles]=useState<File[]>([]), [rows,setRows]=useState<Row[]>([]), [session,setSession]=useState<string|null>(null), [busy,setBusy]=useState(false),[message,setMessage]=useState<import('@/lib/i18n/set2go').Set2GoKey|null>(null)
  const controller=useRef<AbortController|null>(null)
  const sessionRef=useRef<string|null>(null)
  const cleanupRequest=useRef<Promise<void>|null>(null)
  useEffect(()=>{
    let active=true
    const saved=localStorage.getItem('set2go-cloud-session')
    if(saved){
      sessionRef.current=saved
      void api({action:'status',session:saved}).then(s=>{if(active){setSession(saved);setRows(s.tracks.map((r:{id:string;name:string;size:number;state:string})=>({...r,bytes:r.state==='UPLOADED'?r.size:0})))}}).catch(()=>{if(active){setSession(saved);setMessage('Cloud upload failed. Check status before retrying.')}})
    }
    return()=>{active=false;controller.current?.abort()}
  },[])
  async function refresh() {
    if(!sessionRef.current)return null
    try { const s=await api({action:'status',session:sessionRef.current});setRows(s.tracks.map((r:{id:string;name:string;size:number;state:string})=>({...r,bytes:r.state==='UPLOADED'?r.size:0})));setMessage(s.uncertain?'Completion uncertain. Recovery is required before cleanup.':s.state==='UPLOADED'?'Audio staged. Cloud analysis is not available yet.':s.state==='CLEANUP_PENDING'?'Cleanup requested. Deletion may require recovery.':null);return s }catch{setMessage('Cloud upload failed. Check status before retrying.');return null}
  }
  async function requestCleanup(id:string) {
    if (cleanupRequest.current) return cleanupRequest.current
    const pending=(async()=>{
      for(let attempt=0;attempt<8;attempt++) {
        try { await api({action:'cancel',session:id}); return }
        catch(error) {
          if (!error || typeof error!=='object' || !('retryable' in error) || error.retryable!==true || attempt===7) throw error
          await new Promise(resolve=>setTimeout(resolve,150*2**attempt))
        }
      }
    })()
    cleanupRequest.current=pending
    try { await pending } finally { cleanupRequest.current=null }
  }
  async function cancel() {
    controller.current?.abort()
    if(!sessionRef.current)return
    try {await requestCleanup(sessionRef.current);localStorage.removeItem('set2go-cloud-session');sessionRef.current=null;setSession(null);setFiles([]);setRows([]);setMessage('Cleanup requested. Deletion may require recovery.')}catch{setMessage('Cloud upload failed. Check status before retrying.')}
  }
  async function upload() {
    if(busy || session || sessionRef.current)return
    const abort=new AbortController();controller.current=abort;setBusy(true);setMessage(null)
    const currentRows:Row[]=files.map(f=>({name:f.name,size:f.size,state:'Pending',bytes:0}))
    setRows(currentRows)
    try {
      const s=await api({action:'create'},abort.signal);sessionRef.current=s.id;setSession(s.id);localStorage.setItem('set2go-cloud-session',s.id)
      // Reserve the entire selection before completion can make the session UPLOADED.
      for(let i=0;i<files.length;i++){
        const file=files[i]
        const track=await api({action:'reserve',session:s.id,request:crypto.randomUUID(),name:file.name,size:file.size},abort.signal)
        currentRows[i]={...currentRows[i],id:track.id}
      }
      setRows([...currentRows])
      for(let i=0;i<files.length;i++){
        const file=files[i], track={id:currentRows[i].id!}
        const init=await api({action:'initiate',session:s.id,track:track.id},abort.signal)
        let last=0
        await uploadFileParts({file,partSize:init.partSize,signal:abort.signal,
          signPart:async(part:number)=> (await api({action:'sign',session:s.id,track:track.id,part},abort.signal)).url,
          complete:async(parts:{PartNumber:number;ETag:string}[])=>api({action:'complete',session:s.id,track:track.id,parts},abort.signal),
          abortRemote:async()=>{await requestCleanup(s.id)},
          onProgress:(bytes:number)=>{currentRows[i]={...currentRows[i],bytes,state:'Uploading files'};const now=performance.now();if(now-last>100||bytes===file.size){setRows([...currentRows]);last=now}},
        })
        currentRows[i]={...currentRows[i],bytes:file.size,state:'Uploaded'};setRows([...currentRows])
      }
      setFiles([]);setMessage('Audio staged. Cloud analysis is not available yet.')
    }catch(error){
      if (error instanceof AggregateError && error.message.includes('completion is unconfirmed')) {
        const status=await refresh()
        if(status?.uncertain)setMessage('Completion uncertain. Recovery is required before cleanup.')
        else if(status?.state==='UPLOADED')setMessage('Audio staged. Cloud analysis is not available yet.')
        else setMessage('Cloud upload failed. Check status before retrying.')
      } else if (abort.signal.aborted) {
        setMessage('Cleanup requested. Deletion may require recovery.')
      } else {
        const status=sessionRef.current?await refresh():null
        if(status?.state==='CLEANUP_PENDING')setMessage('Cleanup requested. Deletion may require recovery.')
        else if(status?.uncertain)setMessage('Completion uncertain. Recovery is required before cleanup.')
        else setMessage('Cloud upload failed. Check status before retrying.')
      }
    }finally{setBusy(false);controller.current=null}
  }
  const total=rows.reduce((n,r)=>n+r.size,0), loaded=rows.reduce((n,r)=>n+r.bytes,0)
  return <section className="border-t border-white/20 pt-6" aria-label={t('Cloud staging session')}>
    <h2 className="text-lg font-semibold">{t('Cloud staging · development')}</h2><p className="mt-2 text-sm text-[#9ca3a6]">{t('20 tracks · 2 GB total · WAV, AIFF or FLAC')}</p><p className="mt-2 text-sm text-[#9ca3a6]">{t('Cloud upload only. Analysis and export are not enabled.')}</p>
    {!session && <label className="mt-5 flex min-h-28 cursor-pointer items-center justify-center border border-dashed border-[#565c5f] p-4 focus-within:outline-2 focus-within:outline-[#f26a36]">{t('Add tracks')}<input className="sr-only" type="file" multiple accept=".wav,.aif,.aiff,.flac" disabled={busy} onChange={e=>{const next=Array.from(e.target.files??[]);e.target.value='';if(!next.length||next.length>20||next.some(f=>f.size<12||!/\.(wav|aif|aiff|flac)$/i.test(f.name))||next.reduce((n,f)=>n+f.size,0)>2_000_000_000){setMessage('Invalid cloud selection. Use 1–20 supported files, up to 2 GB total.');return}setFiles(next);setRows(next.map(f=>({name:f.name,size:f.size,state:'Pending',bytes:0})));setMessage(null)}} /></label>}
    {rows.length>0&&<><p className="mt-4 text-xs tabular-nums text-[#9ca3a6]">{rows.length} · {loaded.toLocaleString(locale)} / {total.toLocaleString(locale)} bytes</p><progress className={`${progressStyles.determinate} mt-2 h-2 w-full`} aria-label={t('Staging files')} value={loaded} max={total||1}/><ul className="mt-3 divide-y divide-white/10">{rows.map((row,i)=><li key={row.id??i} className="min-w-0 py-3 text-sm"><div className="flex min-w-0 items-center justify-between gap-3"><span className="truncate" title={row.name}>{row.name}</span><span className="shrink-0">{text(locale,['Uploaded','UPLOADED'].includes(row.state)?'Uploaded':row.state==='Uploading files'?'Uploading files':row.state==='VERIFYING'?'Awaiting verification':['UPLOADING','INITIATING'].includes(row.state)?'Interrupted upload':'Pending')}</span></div><div className="mt-2 flex flex-wrap items-center gap-2"><progress className={`${progressStyles.determinate} h-1.5 w-full sm:min-w-0 sm:flex-1`} aria-label={`${t('Track upload progress')}: ${row.name}`} value={row.bytes} max={row.size||1}/><span className="w-full text-right text-xs tabular-nums text-[#9ca3a6] sm:w-auto">{row.bytes.toLocaleString(locale)} / {row.size.toLocaleString(locale)} bytes</span></div></li>)}</ul></>}
    <div className="mt-5 flex flex-wrap gap-3"><button className={actionClass} disabled={busy||!!session||!files.length} onClick={upload}>{t('Upload audio')}</button>{session&&<><button className={actionClass} onClick={cancel}>{t('Cancel and request cleanup')}</button><button className={actionClass} disabled={busy} onClick={refresh}>{t('Refresh upload status')}</button></>}</div>
    {message&&<p role="status" className="mt-4 text-sm leading-6 text-[#b8bdbe]">{t(message)}</p>}
  </section>
}

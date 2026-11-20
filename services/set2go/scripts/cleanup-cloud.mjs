#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createCleanupStore } from '../../../lib/set2go/cloud/cleanup-store.mjs'
import { reconcileCompletions } from '../../../lib/set2go/cloud/completion-recovery.mjs'
import { runCleanup } from '../../../lib/set2go/cloud/cleanup-worker.mjs'
import { developmentR2FromEnv } from '../../../lib/set2go/cloud/r2.mjs'

try {
  const args = process.argv.slice(2)
  if (args.some(a => !['--execute','--dry-run','--limit','--test-runtime','--reconcile'].includes(a) && args[args.indexOf(a)-1] !== '--limit' && args[args.indexOf(a)-1] !== '--test-runtime')) throw Error('Invalid arguments')
  if (args.includes('--execute') === args.includes('--dry-run')) throw Error('Choose --execute or --dry-run')
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 1
  let runtime
  if (args.includes('--test-runtime')) {
    if (process.env.NODE_ENV !== 'test' || !process.env.SET2GO_DISPOSABLE_PG) throw Error('Test runtime disabled')
    runtime = await (await import(pathToFileURL(resolve(args[args.indexOf('--test-runtime') + 1])))).createRuntime()
  } else {
    if (process.env.NODE_ENV !== 'development' || process.env.SET2GO_CLEANUP_ENABLED !== 'enabled') throw Error('Cleanup disabled')
    const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env
    if (!url || !key) throw Error('Missing configuration')
    runtime = { store: createCleanupStore(createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})), storage: developmentR2FromEnv(process.env) }
  }
  if (args.includes('--reconcile')) {
    const result = await reconcileCompletions({ ...runtime, limit, execute: args.includes('--execute'), log: x => process.stdout.write(JSON.stringify(x)+'\n') })
    process.exitCode = result.unresolved ? 1 : 0
  } else {
  const result = await runCleanup({ ...runtime, limit, execute: args.includes('--execute'), log: x => process.stdout.write(JSON.stringify(x)+'\n') })
  process.exitCode = result.failed ? 1 : 0
  }
} catch { process.stderr.write('{"event":"cleanup_failed","details":"suppressed"}\n'); process.exitCode = 1 }

import { DatabaseSync } from 'node:sqlite'
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { CLOUD_MAX_BYTES, CLOUD_MAX_TRACKS } from './session.mjs'

// Local development only; this store must never be used as public authentication.
export function openDevelopmentStore(env = process.env) {
  if (env.NODE_ENV !== 'development' || env.SET2GO_CLOUD_SESSIONS !== 'enabled' || !env.SET2GO_CLOUD_DATA_DIR || !isAbsolute(env.SET2GO_CLOUD_DATA_DIR)) throw new Error('Development session store disabled')
  mkdirSync(env.SET2GO_CLOUD_DATA_DIR, { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(join(env.SET2GO_CLOUD_DATA_DIR, 'upload-sessions.sqlite'))
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, state TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), request_id TEXT NOT NULL, name TEXT NOT NULL, declared INTEGER NOT NULL, reserved INTEGER NOT NULL, verified INTEGER, object_key TEXT NOT NULL UNIQUE, upload_id TEXT, state TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, error TEXT, retries INTEGER NOT NULL DEFAULT 0, UNIQUE(session_id, request_id));
    PRAGMA user_version=1;`)
  const digest = token => createHash('sha256').update(token).digest('hex')
  function check(id, token) {
    if (typeof token !== 'string' || token.length < 32) throw Error('Unauthorized')
    const session = db.prepare('SELECT * FROM sessions WHERE id=?').get(id)
    const expected = session?.owner_hash
    if (!expected || !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(digest(token), 'hex'))) throw Error('Unauthorized')
    return session
  }
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const value = fn(); db.exec('COMMIT'); return value } catch (e) { db.exec('ROLLBACK'); throw e } }
  return {
    close: () => db.close(),
    create() {
      const token = randomBytes(32).toString('base64url')
      const id = randomUUID(), now = Date.now()
      db.prepare("INSERT INTO sessions VALUES (?, ?, 'CREATED', ?, ?)").run(id, digest(token), now, now)
      return { id, token }
    },
    get(id, token) { const session = check(id, token); return { id: session.id, state: session.state, tracks: db.prepare('SELECT id,name,declared,reserved,verified,object_key,upload_id,state,created,updated,error,retries FROM tracks WHERE session_id=? ORDER BY rowid').all(id) } },
    reserve(id, token, requestId, name, size) {
      if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(requestId) || typeof name !== 'string' || name.length > 255 || !/\.(wav|aif|aiff|flac)$/i.test(name) || !Number.isSafeInteger(size) || size < 1) throw Error('Invalid track')
      return transaction(() => {
        const session = check(id, token)
        if (!['CREATED', 'RESERVED', 'UPLOADING'].includes(session.state)) throw Error('Invalid session state')
        const old = db.prepare('SELECT id,name,declared FROM tracks WHERE session_id=? AND request_id=?').get(id, requestId)
        if (old) { if (old.name !== name || old.declared !== size) throw Error('Conflicting request'); return old.id }
        const totals = db.prepare('SELECT count(*) AS count, coalesce(sum(reserved),0) AS bytes FROM tracks WHERE session_id=?').get(id)
        if (totals.count >= CLOUD_MAX_TRACKS || totals.bytes + size > CLOUD_MAX_BYTES) throw Error('Quota exceeded')
        const track = randomUUID(), now = Date.now()
        db.prepare("INSERT INTO tracks(id,session_id,request_id,name,declared,reserved,object_key,state,created,updated) VALUES(?,?,?,?,?,?,?,'RESERVED',?,?)").run(track,id,requestId,name,size,size,`temporary/${id}/input/${track}`,now,now)
        db.prepare("UPDATE sessions SET state='RESERVED',updated=? WHERE id=? AND state='CREATED'").run(now,id)
        return track
      })
    },
  }
}

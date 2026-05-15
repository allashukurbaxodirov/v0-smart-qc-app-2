/**
 * Server-side audit log — globalThis singleton
 * Barcha muhim amallar shu yerga yoziladi
 */

import fs   from 'fs'
import path from 'path'

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAIL'
  | 'LOGOUT'
  | 'CREATE_USER'
  | 'EDIT_USER'
  | 'DELETE_USER'
  | 'BULK_DELETE'
  | 'RESET_PASSWORD'
  | 'CHANGE_TARGETS'

export interface AuditEntry {
  id:        string
  ts:        string          // ISO timestamp
  actor:     string          // tabelNumber
  actorName: string
  actorRole: string
  action:    AuditAction
  target?:   string          // tabel raqami yoki jadval nomi
  details?:  string
  ok:        boolean         // muvaffaqiyatli/muvaffaqiyatsiz
}

// ─── JSON fayl ────────────────────────────────────────────────────────────────
const LOG_FILE   = path.join(process.cwd(), '.audit-log.json')
const MAX_KEEP   = 500

function readFile(): AuditEntry[] {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const d = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'))
      if (Array.isArray(d)) return d
    }
  } catch {}
  return []
}

function writeFile(entries: AuditEntry[]) {
  try { fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2), 'utf-8') } catch {}
}

// ─── Global store ─────────────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __qc_audit_store: AuditEntry[] | undefined
}

if (!globalThis.__qc_audit_store) {
  globalThis.__qc_audit_store = readFile()
}

const store = globalThis.__qc_audit_store

// ─── Public API ───────────────────────────────────────────────────────────────
export const auditLog = {
  /** Yangi yozuv qo'shish */
  add(entry: Omit<AuditEntry, 'id' | 'ts'>) {
    const full: AuditEntry = {
      ...entry,
      id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: new Date().toISOString(),
    }
    store.unshift(full)
    if (store.length > MAX_KEEP) store.splice(MAX_KEEP)
    writeFile(store)
    return full
  },

  /** So'nggi N ta yozuv */
  getRecent(limit = 100): AuditEntry[] {
    return store.slice(0, limit)
  },

  /** Aktor bo'yicha */
  getByActor(tabel: string, limit = 50): AuditEntry[] {
    return store.filter(e => e.actor === tabel).slice(0, limit)
  },

  /** Statistika */
  stats() {
    const total      = store.length
    const today      = new Date().toISOString().split('T')[0]
    const todayCount = store.filter(e => e.ts.startsWith(today)).length
    const failCount  = store.filter(e => !e.ok).length
    const loginFails = store.filter(e => e.action === 'LOGIN_FAIL').length
    return { total, todayCount, failCount, loginFails }
  },
}

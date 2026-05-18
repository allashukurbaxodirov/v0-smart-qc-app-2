/**
 * Server-side audit log
 * PostgreSQL primary + in-memory fallback
 */

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
  ts:        string
  actor:     string
  actorName: string
  actorRole: string
  action:    AuditAction
  target?:   string
  details?:  string
  ok:        boolean
}

// ─── In-memory fallback ───────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __qc_audit_store: AuditEntry[] | undefined
}
if (!globalThis.__qc_audit_store) globalThis.__qc_audit_store = []
const store = globalThis.__qc_audit_store

// ─── PostgreSQL ga async yozish ───────────────────────────────────────────────
async function persistToDb(entry: AuditEntry) {
  try {
    // Dynamic import — server component sifatida ishlaydi
    const { default: sql } = await import('@/lib/db')
    await sql`
      INSERT INTO audit_log (id, ts, actor, actor_name, actor_role, action, target, details, ok)
      VALUES (
        ${entry.id}, ${entry.ts}::timestamptz,
        ${entry.actor}, ${entry.actorName}, ${entry.actorRole},
        ${entry.action}, ${entry.target ?? ''}, ${entry.details ?? ''}, ${entry.ok}
      )
      ON CONFLICT (id) DO NOTHING
    `
  } catch {
    // DB o'chiq — faqat in-memory da qoladi
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const auditLog = {
  add(entry: Omit<AuditEntry, 'id' | 'ts'>) {
    const full: AuditEntry = {
      ...entry,
      id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: new Date().toISOString(),
    }
    // In-memory ga qo'shamiz (sinxron)
    store.unshift(full)
    if (store.length > 500) store.splice(500)
    // DB ga async yozamiz (blok qilmaydi)
    persistToDb(full)
    return full
  },

  getRecent(limit = 100): AuditEntry[] {
    return store.slice(0, limit)
  },

  getByActor(tabel: string, limit = 50): AuditEntry[] {
    return store.filter(e => e.actor === tabel).slice(0, limit)
  },

  stats() {
    const today = new Date().toISOString().split('T')[0]
    return {
      total:      store.length,
      todayCount: store.filter(e => e.ts.startsWith(today)).length,
      failCount:  store.filter(e => !e.ok).length,
      loginFails: store.filter(e => e.action === 'LOGIN_FAIL').length,
    }
  },
}

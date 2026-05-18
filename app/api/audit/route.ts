import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { auditLog } from '@/lib/audit-log'
import sql from '@/lib/db'

async function getSession() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { tabelNumber: string; name: string; role: string } }
  catch { return null }
}

/** GET /api/audit — faqat superadmin/admin */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100'), 500)

  // PostgreSQL dan yuklash + in-memory fallback
  try {
    const rows = await sql`
      SELECT id, ts::text, actor, actor_name, actor_role, action, target, details, ok
      FROM audit_log
      ORDER BY ts DESC
      LIMIT ${limit}
    `
    if (rows.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const stats = {
        total:      rows.length,
        todayCount: rows.filter((r: any) => r.ts?.startsWith(today)).length,
        failCount:  rows.filter((r: any) => !r.ok).length,
        loginFails: rows.filter((r: any) => r.action === 'LOGIN_FAIL').length,
      }
      return NextResponse.json({ entries: rows, stats })
    }
  } catch (e) {
    console.warn('audit GET DB error:', (e as Error).message)
  }

  // Fallback: in-memory
  return NextResponse.json({
    entries: auditLog.getRecent(limit),
    stats:   auditLog.stats(),
  })
}

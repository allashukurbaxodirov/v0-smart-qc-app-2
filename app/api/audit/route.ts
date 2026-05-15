import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { auditLog } from '@/lib/audit-log'

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
  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '100')
  return NextResponse.json({
    entries: auditLog.getRecent(Math.min(limit, 500)),
    stats:   auditLog.stats(),
  })
}

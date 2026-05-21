import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

const DEFAULT_WDPV = {
  vehicles: 50,
  targets: {
    'PLANT':      2.50,
    'PRESS SHOP': 0.40,
    'WELDING-1':  0.45,
    'WELDING-2':  0.45,
    'PAINT SHOP': 0.70,
    'GA':         0.50,
  },
}

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name?: string } } catch { return null }
}

// ─── GET: barcha foydalanuvchilar uchun — target va vehicles ─────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    // Jadval bo'lmasa yaratamiz
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    const [row] = await sql`
      SELECT value FROM app_settings WHERE key = 'wdpv_settings' LIMIT 1
    `
    if (row?.value) {
      // value TEXT yoki JSONB bo'lishi mumkin — ikkalasini handle qilamiz
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
      const result = {
        vehicles: Number(parsed.vehicles) || DEFAULT_WDPV.vehicles,
        targets:  { ...DEFAULT_WDPV.targets, ...(parsed.targets ?? {}) },
      }
      return NextResponse.json(result)
    }
  } catch (e) {
    console.warn('wdpv-settings GET error:', (e as Error).message)
  }
  return NextResponse.json(DEFAULT_WDPV)
}

// ─── POST: faqat superadmin/admin ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = {
      vehicles: Number(body.vehicles) || DEFAULT_WDPV.vehicles,
      targets:  { ...DEFAULT_WDPV.targets, ...(body.targets ?? {}) },
    }

    // Jadval bo'lmasa yaratamiz (TEXT column — universal compatibility)
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    const jsonStr = JSON.stringify(data)
    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('wdpv_settings', ${jsonStr}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value      = EXCLUDED.value,
        updated_at = NOW()
    `

    console.log('[wdpv-settings] Saved to DB:', jsonStr)
    return NextResponse.json({ ok: true, ...data })
  } catch (e: any) {
    console.error('[wdpv-settings] POST error:', e?.message)
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}

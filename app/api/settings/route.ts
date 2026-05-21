import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

export interface AppSettings {
  companyName:       string
  factoryName:       string
  city:              string
  country:           string
  darkMode:          boolean
  notifications:     boolean
  autoRefresh:       boolean
  gcaTarget:         number
  ftqTarget:         number
  drrTarget:         number
  cmmTarget:         number
  alertCritical:     boolean
  alertDailyReport:  boolean
  alertHighDefect:   boolean
}

const DEFAULTS: AppSettings = {
  companyName:      'UzAuto Motors',
  factoryName:      'Tashkent Production Facility',
  city:             'Tashkent',
  country:          'Uzbekistan',
  darkMode:         true,
  notifications:    true,
  autoRefresh:      true,
  gcaTarget:        98.0,
  ftqTarget:        92.0,
  drrTarget:        95.0,
  cmmTarget:        96.0,
  alertCritical:    true,
  alertDailyReport: true,
  alertHighDefect:  true,
}

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string } } catch { return null }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    const [row] = await sql`
      SELECT value FROM app_settings WHERE key = 'main' LIMIT 1
    `
    if (row) {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
      return NextResponse.json({ ...DEFAULTS, ...parsed })
    }
  } catch (e) {
    console.warn('settings GET error:', (e as Error).message)
  }
  return NextResponse.json(DEFAULTS)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const updated: AppSettings = { ...DEFAULTS, ...body }

    try {
      await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('main', ${JSON.stringify(updated)}, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value      = EXCLUDED.value,
          updated_at = NOW()
      `
    } catch (dbErr) {
      console.warn('settings POST DB error:', (dbErr as Error).message)
    }

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}

import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

const FILE = path.join(process.cwd(), '.settings.json')

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

declare global {
  // eslint-disable-next-line no-var
  var __appSettings: AppSettings | undefined
}

function load(): AppSettings {
  if (globalThis.__appSettings) return globalThis.__appSettings
  try {
    if (fs.existsSync(FILE)) {
      const s = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
      globalThis.__appSettings = { ...DEFAULTS, ...s }
      return globalThis.__appSettings!
    }
  } catch {}
  globalThis.__appSettings = { ...DEFAULTS }
  return globalThis.__appSettings
}

function persist(s: AppSettings) {
  globalThis.__appSettings = s
  try { fs.writeFileSync(FILE, JSON.stringify(s, null, 2)) } catch {}
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
  return NextResponse.json(load())
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const updated: AppSettings = { ...load(), ...body }
    persist(updated)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}

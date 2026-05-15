import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

// ─── In-memory + file cache ───────────────────────────────────────────────────
const FILE = path.join(process.cwd(), '.shift-entries.json')

declare global {
  // eslint-disable-next-line no-var
  var __shiftEntriesCache: any[] | undefined
}

function load(): any[] {
  if (globalThis.__shiftEntriesCache) return globalThis.__shiftEntriesCache
  try {
    if (fs.existsSync(FILE)) {
      const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
      globalThis.__shiftEntriesCache = data
      return data
    }
  } catch {}
  globalThis.__shiftEntriesCache = []
  return []
}

function save(data: any[]) {
  globalThis.__shiftEntriesCache = data
  try { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) } catch {}
}

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name: string; tabelNumber?: string } }
  catch { return null }
}

// ─── GET: barcha shift entries ────────────────────────────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  return NextResponse.json(load())
}

// ─── POST: entry qo'shish yoki yangilash (upsert) ────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    const body = await req.json()
    const { id, date, shift, shop, line, drr, drl, incoming, pdi, notes } = body
    if (!date || !shift || !shop) {
      return NextResponse.json({ error: 'date, shift, shop majburiy' }, { status: 400 })
    }

    const entryId = id ?? `se-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const entry = { id: entryId, date, shift, shop, line: line ?? '', drr: drr ?? 0, drl: drl ?? 0, incoming: incoming ?? 0, pdi: pdi ?? 0, notes: notes ?? '' }

    const all  = load()
    const idx  = all.findIndex((e: any) => e.id === entryId)
    const next = idx >= 0
      ? all.map((e: any) => (e.id === entryId ? entry : e))
      : [entry, ...all]

    save(next.slice(0, 5000))
    return NextResponse.json(entry, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}

// ─── DELETE: entry o'chirish ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 })

  const next = load().filter((e: any) => e.id !== id)
  save(next)
  return NextResponse.json({ ok: true })
}

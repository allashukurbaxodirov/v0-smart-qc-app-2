import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { cookies } from 'next/headers'

async function getSession() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// ─── Server-side in-memory cache ─────────────────────────────────────────────
interface CachedRecord {
  id: string
  type: 'd10' | 'd20'
  shop: string
  sector: string | null
  pono: string | null
  code: string
  code_name: string
  factor: number
  count: number
  notes: string | null
  image_url: string | null
  date: string
  shift?: string
  created_by_name?: string | null
}

// globalThis — HMR va server restart da yo'qolmasin
declare global { var __qc_d_records_cache: CachedRecord[] | undefined }
if (!globalThis.__qc_d_records_cache) globalThis.__qc_d_records_cache = []
const memCache = globalThis.__qc_d_records_cache

// ─── GET — auth talab qilinmaydi ──────────────────────────────────────────────
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        r.id, r.type, r.shop, r.sector, r.pono, r.code, r.code_name, r.factor,
        r.count, r.notes, r.image_url,
        COALESCE(r.date::text, r.created_at::date::text) AS date,
        COALESCE(r.shift, 'A') AS shift,
        u.name AS created_by_name
      FROM d_records r
      LEFT JOIN users u ON u.id = r.created_by
      ORDER BY r.created_at DESC
      LIMIT 500
    `
    rows.forEach((row: any) => {
      if (!memCache.find((c) => c.id === row.id)) {
        memCache.unshift({ ...row, pono: row.pono ?? null })
      }
    })
  } catch {
    // DB o'chiq — cache dan qaytaramiz
  }
  return NextResponse.json(memCache)
}

// ─── POST — faqat login qilganlar ─────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, shop, sector, pono, code, codeName, factor, count, notes, imageUrl, date, shift } = body

  if (!type || !shop || !code || !codeName || !factor || !count) {
    return NextResponse.json({ error: "Barcha maydonlar to'ldirilishi shart" }, { status: 400 })
  }

  const recordDate  = date  ?? new Date().toISOString().split('T')[0]
  const recordShift = shift ?? 'A'

  try {
    const tabel = session.tabelNumber ?? ''
    const [user] = tabel
      ? await sql`SELECT id FROM users WHERE tabel_number = ${tabel} LIMIT 1`
      : await sql`SELECT id FROM users WHERE email = ${session.email ?? ''} LIMIT 1`

    const [record] = await sql`
      INSERT INTO d_records (type, shop, sector, pono, code, code_name, factor, count, notes, image_url, created_by, date, shift)
      VALUES (${type}, ${shop}, ${sector ?? null}, ${pono ?? null}, ${code}, ${codeName}, ${factor}, ${count},
              ${notes ?? null}, ${imageUrl ?? null}, ${user?.id ?? null},
              ${recordDate}::date, ${recordShift})
      RETURNING id, type, shop, sector, pono, code, code_name, factor, count, notes, image_url,
                date::text, shift, created_at::date::text AS created_date
    `
    const newRec: CachedRecord = {
      id:              record.id,
      type:            record.type,
      shop:            record.shop,
      sector:          record.sector ?? null,
      pono:            record.pono ?? null,
      code:            record.code,
      code_name:       record.code_name,
      factor:          Number(record.factor),
      count:           Number(record.count),
      notes:           record.notes ?? null,
      image_url:       record.image_url ?? null,
      date:            record.date ?? record.created_date,
      shift:           record.shift ?? 'A',
      created_by_name: session.name ?? null,
    }
    memCache.unshift(newRec)
    return NextResponse.json(newRec, { status: 201 })
  } catch (e) {
    console.warn('d-records POST fallback:', (e as Error).message)
    const tempRecord: CachedRecord = {
      id:              `mem-${Date.now()}`,
      type, shop, sector: sector ?? null, pono: pono ?? null, code,
      code_name:       codeName,
      factor:          Number(factor), count: Number(count),
      notes:           notes ?? null, image_url: imageUrl ?? null,
      date:            recordDate, shift: recordShift,
      created_by_name: session.name ?? null,
    }
    memCache.unshift(tempRecord)
    return NextResponse.json(tempRecord, { status: 201 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID kerak' }, { status: 400 })

  const idx = memCache.findIndex((c) => c.id === id)
  if (idx !== -1) memCache.splice(idx, 1)

  if (!id.startsWith('mem-') && !id.startsWith('local-')) {
    try {
      await sql`DELETE FROM d_records WHERE id = ${id}::uuid`
    } catch {}
  }

  return NextResponse.json({ ok: true })
}

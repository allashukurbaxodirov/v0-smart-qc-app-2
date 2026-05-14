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
  code: string
  code_name: string
  factor: number
  count: number
  notes: string | null
  image_url: string | null
  date: string
  created_by_name?: string | null
}

const memCache: CachedRecord[] = []

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await sql`
      SELECT
        r.id, r.type, r.shop, r.sector, r.code, r.code_name, r.factor,
        r.count, r.notes, r.image_url,
        r.created_at::date::text AS date,
        u.name AS created_by_name
      FROM d_records r
      LEFT JOIN users u ON u.id = r.created_by
      ORDER BY r.created_at DESC
    `
    rows.forEach((row: any) => {
      if (!memCache.find((c) => c.id === row.id)) {
        memCache.unshift(row)
      }
    })
    return NextResponse.json(memCache)
  } catch {
    return NextResponse.json(memCache)
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, shop, sector, code, codeName, factor, count, notes, imageUrl } = body

  if (!type || !shop || !code || !codeName || !factor || !count) {
    return NextResponse.json({ error: "Barcha maydonlar to'ldirilishi shart" }, { status: 400 })
  }

  try {
    const [user] = await sql`SELECT id FROM users WHERE email = ${session.email} LIMIT 1`
    const [record] = await sql`
      INSERT INTO d_records (type, shop, sector, code, code_name, factor, count, notes, image_url, created_by)
      VALUES (${type}, ${shop}, ${sector ?? null}, ${code}, ${codeName}, ${factor}, ${count}, ${notes ?? null}, ${imageUrl ?? null}, ${user?.id ?? null})
      RETURNING id, type, shop, sector, code, code_name, factor, count, notes, image_url, created_at::date::text AS date
    `
    memCache.unshift({ ...record, created_by_name: session.name ?? null } as CachedRecord)
    return NextResponse.json(record, { status: 201 })
  } catch {
    const tempRecord: CachedRecord = {
      id:              `mem-${Date.now()}`,
      type,
      shop,
      sector:          sector ?? null,
      code,
      code_name:       codeName,
      factor:          Number(factor),
      count:           Number(count),
      notes:           notes ?? null,
      image_url:       imageUrl ?? null,
      date:            new Date().toISOString().split('T')[0],
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

  if (!id.startsWith('mem-')) {
    try {
      await sql`DELETE FROM d_records WHERE id = ${id}`
    } catch {}
  }

  return NextResponse.json({ ok: true })
}

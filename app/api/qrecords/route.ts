import { NextResponse } from 'next/server'
import sql from '@/lib/db'

interface CachedQ {
  id: string
  type: string
  date: string
  shift: string
  shop: string
  sector: string | null
  code: string
  code_name: string
  factor: number
  count: number
  notes: string | null
  image_url: string | null
  created_by_name: string | null
}

// Server-side in-memory cache (shared across requests in same Node.js process)
const memCache: CachedQ[] = []

function toClient(r: CachedQ) {
  return {
    id:            r.id,
    type:          r.type,
    date:          r.date,
    shift:         r.shift,
    shop:          r.shop,
    sector:        r.sector,
    code:          r.code,
    codeName:      r.code_name,
    factor:        r.factor,
    count:         r.count,
    notes:         r.notes,
    imageUrl:      r.image_url,
    createdByName: r.created_by_name,
  }
}

// ─── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, type, date::text, shift, shop, sector,
             code, code_name, factor, count, notes, image_url, created_by_name
      FROM qrecords
      ORDER BY created_at DESC
      LIMIT 1000
    `
    for (const row of rows) {
      const rec: CachedQ = {
        id:            row.id,
        type:          row.type,
        date:          row.date,
        shift:         row.shift,
        shop:          row.shop,
        sector:        row.sector ?? null,
        code:          row.code,
        code_name:     row.code_name,
        factor:        Number(row.factor),
        count:         Number(row.count),
        notes:         row.notes ?? null,
        image_url:     row.image_url ?? null,
        created_by_name: row.created_by_name ?? null,
      }
      const idx = memCache.findIndex(r => r.id === rec.id)
      if (idx >= 0) memCache[idx] = rec
      else memCache.unshift(rec)
    }
  } catch (e) {
    console.warn('qrecords DB read failed:', (e as Error).message)
  }
  return NextResponse.json(memCache.map(toClient))
}

// ─── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json()
  const {
    type, date, shift, shop, sector,
    code, codeName, factor, count, notes, imageUrl, createdByName,
  } = body

  let id: string
  try {
    const [row] = await sql`
      INSERT INTO qrecords
        (type, date, shift, shop, sector, code, code_name, factor, count, notes, image_url, created_by_name)
      VALUES
        (${type}, ${date}::date, ${shift}, ${shop},
         ${sector ?? null}, ${code}, ${codeName},
         ${factor}, ${count}, ${notes ?? null},
         ${imageUrl ?? null}, ${createdByName ?? null})
      RETURNING id
    `
    id = row.id
  } catch {
    id = `mem-${Date.now()}`
  }

  const rec: CachedQ = {
    id, type, date, shift, shop,
    sector:          sector ?? null,
    code,
    code_name:       codeName,
    factor:          Number(factor),
    count:           Number(count),
    notes:           notes ?? null,
    image_url:       imageUrl ?? null,
    created_by_name: createdByName ?? null,
  }
  memCache.unshift(rec)
  return NextResponse.json(toClient(rec))
}

// ─── PATCH (sector assignment) ─────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const { id, sector } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const idx = memCache.findIndex(r => r.id === id)
  if (idx >= 0) memCache[idx] = { ...memCache[idx], sector }

  if (!id.startsWith('mem-') && !id.startsWith('local-')) {
    try {
      await sql`UPDATE qrecords SET sector = ${sector} WHERE id = ${id}::uuid`
    } catch {}
  }
  return NextResponse.json({ ok: true })
}

// ─── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const idx = memCache.findIndex(r => r.id === id)
  if (idx >= 0) memCache.splice(idx, 1)

  if (!id.startsWith('mem-') && !id.startsWith('local-')) {
    try {
      await sql`DELETE FROM qrecords WHERE id = ${id}::uuid`
    } catch {}
  }
  return NextResponse.json({ ok: true })
}

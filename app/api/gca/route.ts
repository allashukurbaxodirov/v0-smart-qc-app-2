import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { cookies } from 'next/headers'

async function getSession() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        r.id, r.shop, r.sector, r.code, r.code_name, r.factor,
        r.count, r.notes, r.image_url,
        COALESCE(r.date::text, r.created_at::date::text) AS date,
        COALESCE(r.shift, 'A') AS shift,
        u.name AS created_by_name
      FROM gca_records r
      LEFT JOIN users u ON u.id = r.created_by
      ORDER BY r.created_at DESC
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.warn('gca GET error:', (e as Error).message)
    return NextResponse.json([])
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { shop, sector, code, codeName, factor, count, notes, imageUrl, date, shift } = body

  if (!shop || !code || !codeName || !factor || !count) {
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
      INSERT INTO gca_records (shop, sector, code, code_name, factor, count, notes, image_url, created_by, date, shift)
      VALUES (${shop}, ${sector ?? null}, ${code}, ${codeName}, ${factor}, ${count},
              ${notes ?? null}, ${imageUrl ?? null}, ${user?.id ?? null},
              ${recordDate}::date, ${recordShift})
      RETURNING id, shop, sector, code, code_name, factor, count, notes, image_url,
                date::text, shift, created_at::date::text AS created_date
    `
    return NextResponse.json({
      ...record,
      date:             record.date ?? record.created_date,
      created_by_name:  session.name ?? null,
    }, { status: 201 })
  } catch (e) {
    // DB o'chiq — temp ID bilan qaytaramiz
    console.warn('gca POST fallback:', (e as Error).message)
    return NextResponse.json({
      id:              `mem-${Date.now()}`,
      shop, sector: sector ?? null, code,
      code_name:       codeName,
      factor:          Number(factor), count: Number(count),
      notes:           notes ?? null, image_url: imageUrl ?? null,
      date:            recordDate, shift: recordShift,
      created_by_name: session.name ?? null,
    }, { status: 201 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID kerak' }, { status: 400 })

  if (!id.startsWith('mem-')) {
    try { await sql`DELETE FROM gca_records WHERE id = ${id}` } catch {}
  }
  return NextResponse.json({ ok: true })
}

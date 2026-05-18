import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

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

  try {
    const rows = await sql`
      SELECT id, date::text, shift, shop, line, drr, drl, incoming, pdi, notes
      FROM shift_entries
      ORDER BY date DESC, shift ASC
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.warn('shift-entries GET error:', (e as Error).message)
    return NextResponse.json([])
  }
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

    const entryId = (id && !String(id).startsWith('se-')) ? id
      : `se-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    try {
      const [row] = await sql`
        INSERT INTO shift_entries (id, date, shift, shop, line, drr, drl, incoming, pdi, notes)
        VALUES (${entryId}, ${date}::date, ${shift}, ${shop},
                ${line ?? ''}, ${drr ?? 0}, ${drl ?? 0}, ${incoming ?? 0}, ${pdi ?? 0}, ${notes ?? ''})
        ON CONFLICT (id) DO UPDATE SET
          date     = EXCLUDED.date,
          shift    = EXCLUDED.shift,
          shop     = EXCLUDED.shop,
          line     = EXCLUDED.line,
          drr      = EXCLUDED.drr,
          drl      = EXCLUDED.drl,
          incoming = EXCLUDED.incoming,
          pdi      = EXCLUDED.pdi,
          notes    = EXCLUDED.notes
        RETURNING id, date::text, shift, shop, line, drr, drl, incoming, pdi, notes
      `
      return NextResponse.json(row, { status: 201 })
    } catch (dbErr) {
      console.warn('shift-entries POST DB error:', (dbErr as Error).message)
      return NextResponse.json({ id: entryId, date, shift, shop, line: line ?? '', drr: drr ?? 0, drl: drl ?? 0, incoming: incoming ?? 0, pdi: pdi ?? 0, notes: notes ?? '' }, { status: 201 })
    }
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

  try {
    await sql`DELETE FROM shift_entries WHERE id = ${id}`
  } catch (e) {
    console.warn('shift-entries DELETE error:', (e as Error).message)
  }
  return NextResponse.json({ ok: true })
}

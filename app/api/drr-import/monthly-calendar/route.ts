import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs  = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name: string } } catch { return null }
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS drr_monthly_calendars (
      id         SERIAL PRIMARY KEY,
      year       INT  NOT NULL,
      month      INT  NOT NULL,
      calendar   JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      updated_by TEXT,
      UNIQUE(year, month)
    )
  `
}

// GET /api/drr-import/monthly-calendar?year=2026&month=5
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year  = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))
  if (!year || !month) return NextResponse.json({ error: 'year va month kerak' }, { status: 400 })

  try {
    await ensureTable()
    const [row] = await sql`
      SELECT calendar FROM drr_monthly_calendars WHERE year = ${year} AND month = ${month}
    `
    if (!row) return NextResponse.json({ found: false })
    return NextResponse.json({ found: true, calendar: row.calendar })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/drr-import/monthly-calendar  — saqlash yoki yangilash
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'Faqat SuperAdmin' }, { status: 403 })
  }

  const { year, month, calendar } = await req.json()
  if (!year || !month || !calendar) return NextResponse.json({ error: 'Ma\'lumot yetishmaydi' }, { status: 400 })

  try {
    await ensureTable()
    await sql`
      INSERT INTO drr_monthly_calendars (year, month, calendar, updated_at, updated_by)
      VALUES (${year}, ${month}, ${JSON.stringify(calendar)}, NOW(), ${session.name})
      ON CONFLICT (year, month) DO UPDATE
        SET calendar   = EXCLUDED.calendar,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
    `
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/drr-import/monthly-calendar?year=2026&month=5
// Faqat import ma'lumotlarini o'chiradi, kalendarni saqlab qoladi
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'Faqat SuperAdmin' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year  = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))
  if (!year || !month) return NextResponse.json({ error: 'year va month kerak' }, { status: 400 })

  // Oyning birinchi va oxirgi kuni
  const dateFrom = `${year}-${String(month).padStart(2,'0')}-01`
  const lastDay  = new Date(year, month, 0).getDate()
  const dateTo   = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`

  try {
    // O'sha oy uchun barcha oylik batch larni topamiz
    // (shift_label = A/B/D va oy to'liq range)
    const batches = await sql`
      SELECT import_batch::text AS id
      FROM drr_import_batches
      WHERE date_from = ${dateFrom}::date
        AND date_to   = ${dateTo}::date
        AND shift_label IN ('A','B','D')
    `

    let deleted = 0
    for (const b of batches) {
      await sql`DELETE FROM drr_imports WHERE import_batch = ${b.id}::uuid`
      await sql`DELETE FROM drr_import_batches WHERE import_batch = ${b.id}::uuid`
      deleted++
    }

    return NextResponse.json({ ok: true, deletedBatches: deleted })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

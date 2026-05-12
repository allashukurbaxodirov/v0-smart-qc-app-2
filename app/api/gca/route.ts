import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { cookies } from 'next/headers'

async function getSession() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const records = await sql`
    SELECT
      r.id, r.shop, r.code, r.code_name, r.factor,
      r.count, r.notes, r.image_url,
      r.created_at::date::text AS date,
      u.name AS created_by_name
    FROM gca_records r
    LEFT JOIN users u ON u.id = r.created_by
    ORDER BY r.created_at DESC
  `
  return NextResponse.json(records)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { shop, code, codeName, factor, count, notes, imageUrl } = body

  if (!shop || !code || !codeName || !factor || !count) {
    return NextResponse.json({ error: "Barcha maydonlar to'ldirilishi shart" }, { status: 400 })
  }

  const [user] = await sql`SELECT id FROM users WHERE email = ${session.email} LIMIT 1`

  const [record] = await sql`
    INSERT INTO gca_records (shop, code, code_name, factor, count, notes, image_url, created_by)
    VALUES (${shop}, ${code}, ${codeName}, ${factor}, ${count}, ${notes ?? null}, ${imageUrl ?? null}, ${user?.id ?? null})
    RETURNING id, shop, code, code_name, factor, count, notes, image_url, created_at::date::text AS date
  `
  return NextResponse.json(record, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID kerak' }, { status: 400 })

  await sql`DELETE FROM gca_records WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}

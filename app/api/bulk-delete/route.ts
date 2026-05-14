import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { email: string; role: string; name: string } }
  catch { return null }
}

/**
 * DELETE /api/bulk-delete?table=gca|d10|d20|qrecords|incoming
 * Faqat superadmin yoki admin uchun
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }

  const table = new URL(req.url).searchParams.get('table')
  const confirm = new URL(req.url).searchParams.get('confirm')

  if (confirm !== 'yes') {
    return NextResponse.json({ error: "Tasdiqlash kerak: ?confirm=yes" }, { status: 400 })
  }

  try {
    let deleted = 0

    switch (table) {
      case 'gca':
        const gcaRes = await sql`DELETE FROM gca_records RETURNING id`
        deleted = gcaRes.length
        break
      case 'd10':
        const d10Res = await sql`DELETE FROM d_records WHERE type = 'd10' RETURNING id`
        deleted = d10Res.length
        break
      case 'd20':
        const d20Res = await sql`DELETE FROM d_records WHERE type = 'd20' RETURNING id`
        deleted = d20Res.length
        break
      case 'qrecords':
        const qRes = await sql`DELETE FROM qrecords RETURNING id`
        deleted = qRes.length
        break
      case 'incoming':
        const incRes = await sql`DELETE FROM incoming_records RETURNING id`
        deleted = incRes.length
        break
      default:
        return NextResponse.json({ error: "Noto'g'ri jadval nomi" }, { status: 400 })
    }

    return NextResponse.json({ ok: true, deleted, table })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'DB xatolik' }, { status: 500 })
  }
}

/**
 * GET /api/bulk-delete?table=all  → jadvallar statistikasi
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })
  }
  try {
    const [gca]      = await sql`SELECT COUNT(*)::int AS c FROM gca_records`
    const [d10]      = await sql`SELECT COUNT(*)::int AS c FROM d_records WHERE type = 'd10'`
    const [d20]      = await sql`SELECT COUNT(*)::int AS c FROM d_records WHERE type = 'd20'`
    const [qrec]     = await sql`SELECT COUNT(*)::int AS c FROM qrecords`
    const [incoming] = await sql`SELECT COUNT(*)::int AS c FROM incoming_records`
    return NextResponse.json({
      gca:      gca?.c      ?? 0,
      d10:      d10?.c      ?? 0,
      d20:      d20?.c      ?? 0,
      qrecords: qrec?.c     ?? 0,
      incoming: incoming?.c ?? 0,
    })
  } catch {
    return NextResponse.json({ gca: 0, d10: 0, d20: 0, qrecords: 0, incoming: 0 })
  }
}

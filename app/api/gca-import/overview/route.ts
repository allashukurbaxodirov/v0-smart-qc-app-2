import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// GET /api/gca-import/overview?from=2026-05-01&to=2026-05-31
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') // YYYY-MM-DD
  const to   = searchParams.get('to')   // YYYY-MM-DD

  try {
    // ── 1. Smena bo'yicha yig'ma (A / B / D / null) ──────────────────────────
    const byShift = await sql`
      SELECT
        COALESCE(b.shift_label, '—')                        AS shift_label,
        COUNT(DISTINCT b.import_batch)::int                  AS batch_count,
        COALESCE(SUM(i.gca_weight), 0)::numeric              AS total_weight,
        COUNT(DISTINCT i.vin)::int                            AS veh_count,
        CASE WHEN COUNT(DISTINCT i.vin) > 0
          THEN ROUND(SUM(i.gca_weight) / COUNT(DISTINCT i.vin)::numeric, 2)
          ELSE 0 END                                          AS wdpv,
        MAX(b.imported_at)::text                             AS last_import
      FROM gca_import_batches b
      JOIN gca_imports i ON i.import_batch = b.import_batch
      WHERE 1=1
        ${from ? sql`AND b.date_from >= ${from}::date` : sql``}
        ${to   ? sql`AND b.date_to   <= ${to}::date`   : sql``}
      GROUP BY b.shift_label
      ORDER BY total_weight DESC
    `

    // ── 2. Kunlik trend (batch bo'yicha WDPV) ────────────────────────────────
    const trend = await sql`
      SELECT
        b.date_from::text                                     AS date,
        b.imported_at::text                                   AS imported_at,
        COALESCE(b.shift_label, '—')                         AS shift_label,
        b.imported_by,
        b.file_name,
        b.import_batch::text                                  AS batch_id,
        COALESCE(b.total_weight, 0)::numeric                 AS total_weight,
        COALESCE(b.veh_count, 0)::int                        AS veh_count,
        CASE WHEN COALESCE(b.veh_count, 0) > 0
          THEN ROUND(b.total_weight::numeric / b.veh_count::numeric, 2)
          ELSE 0 END                                          AS wdpv
      FROM gca_import_batches b
      WHERE 1=1
        ${from ? sql`AND b.date_from >= ${from}::date` : sql``}
        ${to   ? sql`AND b.date_to   <= ${to}::date`   : sql``}
      ORDER BY b.date_from ASC, b.imported_at ASC
    `

    // ── 3. Umumiy yig'ma ─────────────────────────────────────────────────────
    const [totals] = await sql`
      SELECT
        COUNT(DISTINCT b.import_batch)::int                   AS batch_count,
        COALESCE(SUM(i.gca_weight), 0)::numeric               AS total_weight,
        COUNT(DISTINCT i.vin)::int                             AS veh_count,
        CASE WHEN COUNT(DISTINCT i.vin) > 0
          THEN ROUND(SUM(i.gca_weight) / COUNT(DISTINCT i.vin)::numeric, 2)
          ELSE 0 END                                           AS wdpv,
        MIN(b.date_from)::text                                AS date_from,
        MAX(b.date_to)::text                                  AS date_to
      FROM gca_import_batches b
      JOIN gca_imports i ON i.import_batch = b.import_batch
      WHERE 1=1
        ${from ? sql`AND b.date_from >= ${from}::date` : sql``}
        ${to   ? sql`AND b.date_to   <= ${to}::date`   : sql``}
    `

    return NextResponse.json({ byShift, trend, totals })
  } catch (e: any) {
    console.error('gca overview error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

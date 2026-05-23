import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string } } catch { return null }
}

// GET /api/incoming/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&warehouse=warehouse-1
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fromParam      = searchParams.get('from')
  const toParam        = searchParams.get('to')
  const warehouseParam = searchParams.get('warehouse') // null = barchasi

  // Default: so'nggi 30 kun
  const today   = new Date().toISOString().split('T')[0]
  const d30ago  = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const from    = fromParam || d30ago
  const to      = toParam   || today

  try {
    // ── WHERE clause ─────────────────────────────────────────────────────────
    const whereBase = warehouseParam
      ? sql`WHERE date >= ${from}::date AND date <= ${to}::date AND warehouse = ${warehouseParam}`
      : sql`WHERE date >= ${from}::date AND date <= ${to}::date`

    // ── Jami statistika ───────────────────────────────────────────────────────
    const [totals] = await sql`
      SELECT
        COUNT(*)::int                                            AS row_count,
        COALESCE(SUM(total_count),  0)::int                     AS total_parts,
        COALESCE(SUM(defect_count), 0)::int                     AS total_defects,
        CASE WHEN SUM(total_count) > 0
          THEN ROUND((1 - SUM(defect_count)::numeric / SUM(total_count)) * 100, 1)
          ELSE 100 END                                          AS acceptance_rate,
        CASE WHEN SUM(total_count) > 0
          THEN ROUND(SUM(defect_count)::numeric / SUM(total_count) * 100, 1)
          ELSE 0 END                                            AS defect_rate,
        COUNT(DISTINCT supplier)::int                           AS supplier_count,
        COUNT(DISTINCT part_number)::int                        AS part_count,
        MIN(date)::text                                         AS date_from,
        MAX(date)::text                                         AS date_to
      FROM incoming_records
      ${whereBase}
    `

    if (!totals || Number(totals.row_count) === 0) {
      return NextResponse.json({ empty: true })
    }

    // ── Bugungi statistika ────────────────────────────────────────────────────
    const [todayStats] = await sql`
      SELECT
        COALESCE(SUM(total_count),  0)::int AS today_parts,
        COALESCE(SUM(defect_count), 0)::int AS today_defects,
        COUNT(*)::int                       AS today_entries
      FROM incoming_records
      WHERE date = ${today}::date
        ${warehouseParam ? sql`AND warehouse = ${warehouseParam}` : sql``}
    `

    // ── Ombor bo'yicha ────────────────────────────────────────────────────────
    const byWarehouse = await sql`
      SELECT
        warehouse,
        COUNT(*)::int                                            AS entry_count,
        COALESCE(SUM(total_count),  0)::int                     AS total_parts,
        COALESCE(SUM(defect_count), 0)::int                     AS total_defects,
        CASE WHEN SUM(total_count) > 0
          THEN ROUND(SUM(defect_count)::numeric / SUM(total_count) * 100, 1)
          ELSE 0 END                                            AS defect_rate,
        CASE WHEN SUM(total_count) > 0
          THEN ROUND((1 - SUM(defect_count)::numeric / SUM(total_count)) * 100, 1)
          ELSE 100 END                                          AS acceptance_rate,
        COUNT(DISTINCT supplier)::int                           AS supplier_count
      FROM incoming_records
      ${whereBase}
      GROUP BY warehouse
      ORDER BY total_defects DESC
    `

    // ── Top 10 yetkazib beruvchi (nuqson bo'yicha) ─────────────────────────────
    const topSuppliers = await sql`
      SELECT
        supplier,
        COUNT(*)::int                                            AS entry_count,
        COALESCE(SUM(total_count),  0)::int                     AS total_parts,
        COALESCE(SUM(defect_count), 0)::int                     AS total_defects,
        CASE WHEN SUM(total_count) > 0
          THEN ROUND(SUM(defect_count)::numeric / SUM(total_count) * 100, 1)
          ELSE 0 END                                            AS defect_rate,
        COUNT(DISTINCT part_number)::int                        AS part_types
      FROM incoming_records
      ${whereBase}
        AND defect_count > 0
      GROUP BY supplier
      ORDER BY total_defects DESC
      LIMIT 10
    `

    // ── Top 10 nuqson kodi bo'yicha ────────────────────────────────────────────
    const topDefects = await sql`
      SELECT
        COALESCE(defect_code_name, defect_code, 'Nomaʼlum') AS defect_name,
        defect_code,
        COUNT(*)::int                                         AS entry_count,
        COALESCE(SUM(defect_count), 0)::int                  AS total_defects,
        COUNT(DISTINCT supplier)::int                         AS supplier_count,
        COUNT(DISTINCT part_number)::int                      AS part_count
      FROM incoming_records
      ${whereBase}
        AND defect_count > 0
        AND (defect_code IS NOT NULL OR defect_code_name IS NOT NULL)
      GROUP BY defect_code_name, defect_code
      ORDER BY total_defects DESC
      LIMIT 10
    `

    // ── Top 10 nuqsonli detal ──────────────────────────────────────────────────
    const topParts = await sql`
      SELECT
        part_number,
        COALESCE(MAX(part_name), part_number) AS part_name,
        COUNT(*)::int                          AS entry_count,
        COALESCE(SUM(total_count),  0)::int    AS total_parts,
        COALESCE(SUM(defect_count), 0)::int    AS total_defects,
        CASE WHEN SUM(total_count) > 0
          THEN ROUND(SUM(defect_count)::numeric / SUM(total_count) * 100, 1)
          ELSE 0 END                           AS defect_rate,
        COUNT(DISTINCT supplier)::int          AS supplier_count
      FROM incoming_records
      ${whereBase}
        AND defect_count > 0
      GROUP BY part_number
      ORDER BY total_defects DESC
      LIMIT 10
    `

    // ── Smena bo'yicha ────────────────────────────────────────────────────────
    const byShift = await sql`
      SELECT
        shift,
        COUNT(*)::int                                            AS entry_count,
        COALESCE(SUM(total_count),  0)::int                     AS total_parts,
        COALESCE(SUM(defect_count), 0)::int                     AS total_defects,
        CASE WHEN SUM(total_count) > 0
          THEN ROUND(SUM(defect_count)::numeric / SUM(total_count) * 100, 1)
          ELSE 0 END                                            AS defect_rate
      FROM incoming_records
      ${whereBase}
      GROUP BY shift
      ORDER BY total_defects DESC
    `

    // ── Kunlik trend (sana oralig'i ichida har bir kun) ────────────────────────
    const dailyTrend = await sql`
      SELECT
        date::text                                               AS day,
        COALESCE(SUM(total_count),  0)::int                     AS total_parts,
        COALESCE(SUM(defect_count), 0)::int                     AS total_defects,
        COUNT(*)::int                                            AS entry_count,
        CASE WHEN SUM(total_count) > 0
          THEN ROUND(SUM(defect_count)::numeric / SUM(total_count) * 100, 1)
          ELSE 0 END                                            AS defect_rate
      FROM incoming_records
      ${whereBase}
      GROUP BY date
      ORDER BY date ASC
    `

    // ── Operator bo'yicha ─────────────────────────────────────────────────────
    const byOperator = await sql`
      SELECT
        COALESCE(created_by_name, 'Nomaʼlum')                   AS operator,
        COUNT(*)::int                                            AS entry_count,
        COALESCE(SUM(total_count),  0)::int                     AS total_parts,
        COALESCE(SUM(defect_count), 0)::int                     AS total_defects
      FROM incoming_records
      ${whereBase}
      GROUP BY created_by_name
      ORDER BY entry_count DESC
      LIMIT 10
    `

    return NextResponse.json({
      totals: {
        ...totals,
        today_parts:   Number(todayStats?.today_parts   ?? 0),
        today_defects: Number(todayStats?.today_defects ?? 0),
        today_entries: Number(todayStats?.today_entries ?? 0),
      },
      byWarehouse,
      topSuppliers,
      topDefects,
      topParts,
      byShift,
      dailyTrend,
      byOperator,
    })
  } catch (e: any) {
    console.error('incoming/stats error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

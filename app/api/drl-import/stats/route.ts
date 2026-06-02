import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string } } catch { return null }
}

// GET /api/drl-import/stats?batch=UUID
// GET /api/drl-import/stats?from=2026-05-01&to=2026-05-31  (date-range aggregate)
// GET /api/drl-import/stats?from=...&to=...&shift=A        (smena filter)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const batchParam = searchParams.get('batch')
  const fromParam  = searchParams.get('from')
  const toParam    = searchParams.get('to')
  const shiftParam = searchParams.get('shift')  // A | B | D | null

  const isDateMode = !batchParam && !!(fromParam && toParam)

  try {
    let batchId = ''
    if (!isDateMode) {
      if (batchParam) {
        batchId = batchParam
      } else {
        // If shift filter applied, get latest batch with that shift_label
        const [latest] = shiftParam
          ? await sql`
              SELECT import_batch::text AS id FROM drl_import_batches
              WHERE shift_label = ${shiftParam}
              ORDER BY imported_at DESC LIMIT 1
            `
          : await sql`
              SELECT import_batch::text AS id FROM drl_import_batches
              ORDER BY imported_at DESC LIMIT 1
            `
        if (!latest) return NextResponse.json({ empty: true })
        batchId = latest.id
      }
    }

    // ── FROM + WHERE clauses ─────────────────────────────────────────────────
    // When shift filter is needed, JOIN with drl_import_batches
    const needsJoin = isDateMode && !!shiftParam

    const fromClause = needsJoin
      ? sql`FROM drl_imports i JOIN drl_import_batches b ON b.import_batch = i.import_batch`
      : sql`FROM drl_imports i`

    // date overlap: batch range overlaps the requested [from, to] window
    // works for both daily uploads (date_from=date_to=day) and monthly (date_from=Apr1, date_to=Apr30)
    const whereClause = isDateMode
      ? (needsJoin
          ? sql`WHERE i.date_to >= ${fromParam}::date AND i.date_from <= ${toParam}::date
                  AND b.shift_label = ${shiftParam}`
          : sql`WHERE i.date_to >= ${fromParam}::date AND i.date_from <= ${toParam}::date`)
      : sql`WHERE i.import_batch = ${batchId}::uuid`

    const [totals] = await sql`
      SELECT
        COUNT(*)::int                                                              AS row_count,
        COALESCE(SUM(i.count), 0)::int                                            AS total_count,
        COALESCE(SUM(CASE WHEN i.model_group='R7'  THEN i.count ELSE 0 END), 0)::int AS damas_count,
        COALESCE(SUM(CASE WHEN i.model_group='R7A' THEN i.count ELSE 0 END), 0)::int AS labo_count,
        MIN(i.date_from)::text  AS date_from,
        MAX(i.date_to)::text    AS date_to,
        MIN(i.shift_from)       AS shift_from,
        MAX(i.shift_to)         AS shift_to,
        MAX(i.file_name)        AS file_name
      ${fromClause}
      ${whereClause}
    `

    if (!totals || Number(totals.row_count) === 0) {
      return NextResponse.json({ empty: true })
    }

    const byShop = await sql`
      SELECT
        i.shop,
        SUM(i.count)::int                                                    AS total,
        SUM(CASE WHEN i.model_group='R7'  THEN i.count ELSE 0 END)::int     AS damas,
        SUM(CASE WHEN i.model_group='R7A' THEN i.count ELSE 0 END)::int     AS labo
      ${fromClause}
      ${whereClause}
      GROUP BY i.shop ORDER BY total DESC
    `

    const byModel = await sql`
      SELECT i.model_label, SUM(i.count)::int AS total
      ${fromClause}
      ${whereClause}
      GROUP BY i.model_label ORDER BY total DESC
    `

    const byPartLv1 = await sql`
      SELECT i.part_lv1, SUM(i.count)::int AS total
      ${fromClause}
      ${whereClause}
        AND i.part_lv1 IS NOT NULL AND i.part_lv1 != ''
      GROUP BY i.part_lv1 ORDER BY total DESC LIMIT 10
    `

    const top10raw = await sql`
      SELECT
        i.fault_code,
        i.fault_name,
        i.prod_team,
        i.shop,
        i.part_lv1,
        SUM(i.count)::int                                                   AS group_count,
        COALESCE(SUM(i.veh_cnt), 0)::int                                    AS group_veh,
        SUM(CASE WHEN i.model_group='R7'  THEN i.count ELSE 0 END)::int     AS model_damas,
        SUM(CASE WHEN i.model_group='R7A' THEN i.count ELSE 0 END)::int     AS model_labo,
        ROUND(SUM(i.drl_ratio)::numeric, 1)                                 AS drl_ratio_sum
      ${fromClause}
      ${whereClause}
      GROUP BY i.fault_code, i.fault_name, i.prod_team, i.shop, i.part_lv1
      ORDER BY SUM(i.count) DESC
    `

    // Merge by fault_code: pick dominant prod_team/shop/part_lv1
    const faultMap: Record<string, any> = {}
    for (const row of top10raw) {
      const key = row.fault_code
      if (!faultMap[key]) {
        faultMap[key] = {
          fault_code:    row.fault_code,
          fault_name:    row.fault_name,
          total_count:   0,
          total_veh_cnt: 0,
          drl_ratio_sum: 0,
          model_damas:   0,
          model_labo:    0,
          top_prod_team: row.prod_team,
          top_shop:      row.shop,
          top_part_lv1:  row.part_lv1,
          _topGroupCount: 0,
        }
      }
      const agg = faultMap[key]
      agg.total_count   += Number(row.group_count)
      agg.total_veh_cnt += Number(row.group_veh)
      agg.drl_ratio_sum += Number(row.drl_ratio_sum)
      agg.model_damas   += Number(row.model_damas)
      agg.model_labo    += Number(row.model_labo)
      if (Number(row.group_count) > agg._topGroupCount) {
        agg._topGroupCount = Number(row.group_count)
        agg.top_prod_team  = row.prod_team
        agg.top_shop       = row.shop
        agg.top_part_lv1   = row.part_lv1
      }
    }

    const top10 = Object.values(faultMap)
      .sort((a, b) => b.total_count - a.total_count)
      .slice(0, 10)
      .map((f, i) => ({ ...f, rank: i + 1, _topGroupCount: undefined }))

    return NextResponse.json({ batchId: isDateMode ? null : batchId, totals, byShop, byModel, byPartLv1, top10 })
  } catch (e: any) {
    console.error('drl-import/stats error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

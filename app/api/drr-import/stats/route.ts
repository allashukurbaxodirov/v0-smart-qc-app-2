import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string } } catch { return null }
}

// GET /api/drr-import/stats?batch=UUID
// GET /api/drr-import/stats?from=2026-05-01&to=2026-05-31  (date-range aggregate)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const batchParam = searchParams.get('batch')
  const fromParam  = searchParams.get('from')   // YYYY-MM-DD
  const toParam    = searchParams.get('to')     // YYYY-MM-DD

  // Date-range mode: from+to berilgan, batch yo'q
  const isDateMode = !batchParam && !!(fromParam && toParam)

  try {
    // ── WHERE clause helper ────────────────────────────────────────────────
    let batchId = ''
    if (!isDateMode) {
      if (batchParam) {
        batchId = batchParam
      } else {
        const [latest] = await sql`
          SELECT import_batch::text AS id FROM drr_import_batches
          ORDER BY imported_at DESC LIMIT 1
        `
        if (!latest) return NextResponse.json({ empty: true })
        batchId = latest.id
      }
    }

    const whereClause = isDateMode
      ? sql`WHERE date_from >= ${fromParam}::date AND date_from <= ${toParam}::date`
      : sql`WHERE import_batch = ${batchId}::uuid`

    // Jami statistika
    const [totals] = await sql`
      SELECT
        COUNT(*)::int                                                               AS row_count,
        COALESCE(SUM(count), 0)::int                                               AS total_count,
        COALESCE(SUM(veh_cnt), 0)::int                                             AS total_veh,
        COALESCE(SUM(CASE WHEN model_group='R7'  THEN count ELSE 0 END), 0)::int   AS damas_count,
        COALESCE(SUM(CASE WHEN model_group='R7A' THEN count ELSE 0 END), 0)::int   AS labo_count,
        COALESCE(SUM(CASE WHEN model_group='R7'  THEN veh_cnt ELSE 0 END), 0)::int AS damas_veh,
        COALESCE(SUM(CASE WHEN model_group='R7A' THEN veh_cnt ELSE 0 END), 0)::int AS labo_veh,
        MIN(date_from)::text  AS date_from,
        MAX(date_to)::text    AS date_to,
        MIN(shift_from)       AS shift_from,
        MAX(shift_to)         AS shift_to,
        MAX(file_name)        AS file_name
      FROM drr_imports
      ${whereClause}
    `

    if (!totals || Number(totals.row_count) === 0) {
      return NextResponse.json({ empty: true })
    }

    // Sehlar bo'yicha taqsimot
    const byShop = await sql`
      SELECT
        shop,
        SUM(count)::int                                                      AS total,
        SUM(veh_cnt)::int                                                    AS veh_total,
        SUM(CASE WHEN model_group='R7'  THEN count ELSE 0 END)::int          AS damas,
        SUM(CASE WHEN model_group='R7A' THEN count ELSE 0 END)::int          AS labo
      FROM drr_imports
      ${whereClause}
      GROUP BY shop ORDER BY total DESC
    `

    // Model bo'yicha
    const byModel = await sql`
      SELECT model_label,
             SUM(count)::int   AS total,
             SUM(veh_cnt)::int AS veh_total
      FROM drr_imports
      ${whereClause}
      GROUP BY model_label ORDER BY total DESC
    `

    // Qism kategoriyalari bo'yicha (top 10)
    const byPartLv1 = await sql`
      SELECT part_lv1,
             SUM(count)::int   AS total,
             SUM(veh_cnt)::int AS veh_total
      FROM drr_imports
      ${whereClause}
        AND part_lv1 IS NOT NULL AND part_lv1 != ''
      GROUP BY part_lv1 ORDER BY total DESC LIMIT 10
    `

    // Top 10 nuqsonlar — fault_code bo'yicha aggregate
    const top10raw = await sql`
      SELECT
        fault_code,
        fault_name,
        prod_team,
        shop,
        part_lv1,
        SUM(count)::int                                                    AS group_count,
        SUM(veh_cnt)::int                                                  AS group_veh,
        SUM(CASE WHEN model_group='R7'  THEN count ELSE 0 END)::int        AS model_damas,
        SUM(CASE WHEN model_group='R7A' THEN count ELSE 0 END)::int        AS model_labo,
        SUM(CASE WHEN model_group='R7'  THEN veh_cnt ELSE 0 END)::int      AS veh_damas,
        SUM(CASE WHEN model_group='R7A' THEN veh_cnt ELSE 0 END)::int      AS veh_labo
      FROM drr_imports
      ${whereClause}
      GROUP BY fault_code, fault_name, prod_team, shop, part_lv1
      ORDER BY SUM(count) DESC
    `

    // fault_code bo'yicha birlashtirish (dominant prod_team/shop/part_lv1 ni tanlaymiz)
    const faultMap: Record<string, any> = {}
    for (const row of top10raw) {
      const key = row.fault_code
      if (!faultMap[key]) {
        faultMap[key] = {
          fault_code:     row.fault_code,
          fault_name:     row.fault_name,
          total_count:    0,
          total_veh_cnt:  0,
          model_damas:    0,
          model_labo:     0,
          veh_damas:      0,
          veh_labo:       0,
          top_prod_team:  row.prod_team,
          top_shop:       row.shop,
          top_part_lv1:   row.part_lv1,
          _topGroup:      0,
        }
      }
      const agg = faultMap[key]
      agg.total_count   += Number(row.group_count)
      agg.total_veh_cnt += Number(row.group_veh)
      agg.model_damas   += Number(row.model_damas)
      agg.model_labo    += Number(row.model_labo)
      agg.veh_damas     += Number(row.veh_damas)
      agg.veh_labo      += Number(row.veh_labo)
      // Dominant group (eng ko'p nuqson bo'lgan prod_team/shop/part_lv1)
      if (Number(row.group_count) > agg._topGroup) {
        agg._topGroup    = Number(row.group_count)
        agg.top_prod_team = row.prod_team
        agg.top_shop     = row.shop
        agg.top_part_lv1 = row.part_lv1
      }
    }

    const top10 = Object.values(faultMap)
      .sort((a, b) => b.total_count - a.total_count)
      .slice(0, 10)
      .map((f, i) => ({ ...f, rank: i + 1, _topGroup: undefined }))

    return NextResponse.json({ batchId: isDateMode ? null : batchId, totals, byShop, byModel, byPartLv1, top10 })
  } catch (e: any) {
    console.error('drr-import/stats error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

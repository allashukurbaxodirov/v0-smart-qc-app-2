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
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const batchParam = searchParams.get('batch')

  try {
    // Resolve batch: use param or latest
    let batchId: string
    if (batchParam) {
      batchId = batchParam
    } else {
      const [latest] = await sql`
        SELECT import_batch::text AS id FROM drl_import_batches
        ORDER BY imported_at DESC LIMIT 1
      `
      if (!latest) return NextResponse.json({ empty: true })
      batchId = latest.id
    }

    const [totals] = await sql`
      SELECT
        COUNT(*)::int                                                              AS row_count,
        COALESCE(SUM(count), 0)::int                                              AS total_count,
        COALESCE(SUM(CASE WHEN model_group='R7'  THEN count ELSE 0 END), 0)::int AS damas_count,
        COALESCE(SUM(CASE WHEN model_group='R7A' THEN count ELSE 0 END), 0)::int AS labo_count,
        MIN(date_from)::text  AS date_from,
        MAX(date_to)::text    AS date_to,
        MIN(shift_from)       AS shift_from,
        MAX(shift_to)         AS shift_to,
        MAX(file_name)        AS file_name
      FROM drl_imports
      WHERE import_batch = ${batchId}::uuid
    `

    // If batch exists in batches table but has no rows (edge case), return empty
    if (!totals || Number(totals.row_count) === 0) {
      return NextResponse.json({ empty: true })
    }

    const byShop = await sql`
      SELECT shop, SUM(count)::int AS total
      FROM drl_imports
      WHERE import_batch = ${batchId}::uuid
      GROUP BY shop ORDER BY total DESC
    `

    const byModel = await sql`
      SELECT model_label, SUM(count)::int AS total
      FROM drl_imports
      WHERE import_batch = ${batchId}::uuid
      GROUP BY model_label ORDER BY total DESC
    `

    const byPartLv1 = await sql`
      SELECT part_lv1, SUM(count)::int AS total
      FROM drl_imports
      WHERE import_batch = ${batchId}::uuid
        AND part_lv1 IS NOT NULL AND part_lv1 != ''
      GROUP BY part_lv1 ORDER BY total DESC LIMIT 10
    `

    // Top 10 faults — simple aggregation, no subqueries
    const top10raw = await sql`
      SELECT
        fault_code,
        fault_name,
        prod_team,
        shop,
        part_lv1,
        SUM(count)::int                                                   AS group_count,
        COALESCE(SUM(veh_cnt), 0)::int                                    AS group_veh,
        SUM(CASE WHEN model_group='R7'  THEN count ELSE 0 END)::int       AS model_damas,
        SUM(CASE WHEN model_group='R7A' THEN count ELSE 0 END)::int       AS model_labo,
        ROUND(SUM(drl_ratio)::numeric, 1)                                  AS drl_ratio_sum
      FROM drl_imports
      WHERE import_batch = ${batchId}::uuid
      GROUP BY fault_code, fault_name, prod_team, shop, part_lv1
      ORDER BY SUM(count) DESC
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

    return NextResponse.json({ batchId, totals, byShop, byModel, byPartLv1, top10 })
  } catch (e: any) {
    console.error('drl-import/stats error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

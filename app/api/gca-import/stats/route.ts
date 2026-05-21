import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string } } catch { return null }
}

// GET /api/gca-import/stats?batch=UUID
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const batchParam = searchParams.get('batch')

  try {
    // Batch aniqlash: param yoki oxirgisi
    let batchId: string
    if (batchParam) {
      batchId = batchParam
    } else {
      const [latest] = await sql`
        SELECT import_batch::text AS id FROM gca_import_batches
        ORDER BY imported_at DESC LIMIT 1
      `
      if (!latest) return NextResponse.json({ empty: true })
      batchId = latest.id
    }

    // Jami statistika
    const [totals] = await sql`
      SELECT
        COUNT(*)::int                                                                  AS row_count,
        COALESCE(SUM(gca_weight), 0)::numeric                                         AS total_weight,
        COUNT(DISTINCT vin)::int                                                       AS veh_count,
        COALESCE(SUM(CASE WHEN model_group = 'R7'  THEN gca_weight ELSE 0 END), 0)   AS damas_weight,
        COALESCE(SUM(CASE WHEN model_group = 'R7A' THEN gca_weight ELSE 0 END), 0)   AS labo_weight,
        COUNT(DISTINCT CASE WHEN model_group = 'R7'  THEN vin END)::int               AS damas_veh,
        COUNT(DISTINCT CASE WHEN model_group = 'R7A' THEN vin END)::int               AS labo_veh,
        MIN(reporting_date)::text  AS date_from,
        MAX(reporting_date)::text  AS date_to
      FROM gca_imports
      WHERE import_batch = ${batchId}::uuid
    `

    if (!totals || Number(totals.row_count) === 0) {
      return NextResponse.json({ empty: true })
    }

    // WDPV = total_weight / veh_count
    const totalWeight = Number(totals.total_weight)
    const vehCount    = Number(totals.veh_count)
    const wdpv        = vehCount > 0 ? Math.round((totalWeight / vehCount) * 100) / 100 : 0

    // Sehlar bo'yicha (faktor taqsimoti bilan)
    const byShop = await sql`
      SELECT
        shop,
        COUNT(*)::int                                                              AS row_count,
        COALESCE(SUM(gca_weight), 0)::numeric                                     AS total_weight,
        COUNT(DISTINCT vin)::int                                                   AS veh_count,
        COALESCE(SUM(CASE WHEN gca_weight = 50 THEN 1 ELSE 0 END), 0)::int        AS f50,
        COALESCE(SUM(CASE WHEN gca_weight = 20 THEN 1 ELSE 0 END), 0)::int        AS f20,
        COALESCE(SUM(CASE WHEN gca_weight = 10 THEN 1 ELSE 0 END), 0)::int        AS f10,
        COALESCE(SUM(CASE WHEN gca_weight = 5  THEN 1 ELSE 0 END), 0)::int        AS f5,
        CASE WHEN COUNT(DISTINCT vin) > 0
          THEN ROUND(SUM(gca_weight) / COUNT(DISTINCT vin)::numeric, 2)
          ELSE 0 END                                                               AS wdpv
      FROM gca_imports
      WHERE import_batch = ${batchId}::uuid
      GROUP BY shop ORDER BY total_weight DESC
    `

    // Model bo'yicha
    const byModel = await sql`
      SELECT
        model_label,
        model_group,
        COUNT(*)::int                AS row_count,
        COALESCE(SUM(gca_weight), 0) AS total_weight,
        COUNT(DISTINCT vin)::int     AS veh_count,
        CASE WHEN COUNT(DISTINCT vin) > 0
          THEN ROUND(SUM(gca_weight) / COUNT(DISTINCT vin)::numeric, 2)
          ELSE 0 END                 AS wdpv
      FROM gca_imports
      WHERE import_batch = ${batchId}::uuid
      GROUP BY model_label, model_group ORDER BY total_weight DESC
    `

    // Part Level 1 bo'yicha (top 10)
    const byPartLv1 = await sql`
      SELECT
        part_lv1,
        COUNT(*)::int                AS row_count,
        COALESCE(SUM(gca_weight), 0) AS total_weight,
        COUNT(DISTINCT vin)::int     AS veh_count
      FROM gca_imports
      WHERE import_batch = ${batchId}::uuid
        AND part_lv1 IS NOT NULL AND part_lv1 != ''
      GROUP BY part_lv1 ORDER BY total_weight DESC LIMIT 10
    `

    // Category bo'yicha
    const byCategory = await sql`
      SELECT
        category,
        COUNT(*)::int                AS row_count,
        COALESCE(SUM(gca_weight), 0) AS total_weight
      FROM gca_imports
      WHERE import_batch = ${batchId}::uuid
        AND category IS NOT NULL AND category != ''
      GROUP BY category ORDER BY total_weight DESC
    `

    // Top 10 nuqsonlar — fault_code bo'yicha
    const top10raw = await sql`
      SELECT
        fault_code,
        fault_name,
        prod_team,
        shop,
        part_lv1,
        COUNT(*)::int                                                                 AS row_count,
        COALESCE(SUM(gca_weight), 0)                                                  AS group_weight,
        COUNT(DISTINCT vin)::int                                                       AS group_veh,
        COUNT(DISTINCT CASE WHEN model_group = 'R7'  THEN vin END)::int               AS veh_damas,
        COUNT(DISTINCT CASE WHEN model_group = 'R7A' THEN vin END)::int               AS veh_labo
      FROM gca_imports
      WHERE import_batch = ${batchId}::uuid
      GROUP BY fault_code, fault_name, prod_team, shop, part_lv1
      ORDER BY SUM(gca_weight) DESC
    `

    // fault_code bo'yicha birlashtirish (dominant prod_team/shop)
    const faultMap: Record<string, any> = {}
    for (const row of top10raw) {
      const key = row.fault_code
      if (!faultMap[key]) {
        faultMap[key] = {
          fault_code:     row.fault_code,
          fault_name:     row.fault_name,
          total_weight:   0,
          total_veh:      0,
          veh_damas:      0,
          veh_labo:       0,
          top_prod_team:  row.prod_team,
          top_shop:       row.shop,
          top_part_lv1:   row.part_lv1,
          _topGroup:      0,
        }
      }
      const agg = faultMap[key]
      agg.total_weight  += Number(row.group_weight)
      agg.total_veh     += Number(row.group_veh)
      agg.veh_damas     += Number(row.veh_damas)
      agg.veh_labo      += Number(row.veh_labo)
      if (Number(row.group_weight) > agg._topGroup) {
        agg._topGroup    = Number(row.group_weight)
        agg.top_prod_team = row.prod_team
        agg.top_shop      = row.shop
        agg.top_part_lv1  = row.part_lv1
      }
    }

    const top10 = Object.values(faultMap)
      .sort((a, b) => b.total_weight - a.total_weight)
      .slice(0, 10)
      .map((f, i) => ({ ...f, rank: i + 1, _topGroup: undefined }))

    // Batch info
    const [batchInfo] = await sql`
      SELECT
        import_batch::text AS id,
        imported_at, imported_by, file_name,
        date_from::text, date_to::text,
        shift_from, shift_to
      FROM gca_import_batches
      WHERE import_batch = ${batchId}::uuid
    `

    return NextResponse.json({
      batchId,
      batchInfo,
      totals: { ...totals, wdpv },
      byShop,
      byModel,
      byPartLv1,
      byCategory,
      top10,
    })
  } catch (e: any) {
    console.error('gca-import/stats error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

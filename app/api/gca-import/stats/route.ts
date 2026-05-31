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
// GET /api/gca-import/stats?from=2026-05-01&to=2026-05-31&shift=A  (date-range aggregate)
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
        const [latest] = await sql`
          SELECT import_batch::text AS id FROM gca_import_batches
          ORDER BY imported_at DESC LIMIT 1
        `
        if (!latest) return NextResponse.json({ empty: true })
        batchId = latest.id
      }
    }

    // FROM clause — JOIN batches only when shift filter needed
    const fromClause = (isDateMode && shiftParam)
      ? sql`FROM gca_imports i JOIN gca_import_batches b ON b.import_batch = i.import_batch`
      : sql`FROM gca_imports i`

    // WHERE clause
    const whereClause = isDateMode
      ? (shiftParam
          ? sql`WHERE i.reporting_date >= ${fromParam}::date AND i.reporting_date <= ${toParam}::date
                  AND b.shift_label = ${shiftParam}`
          : sql`WHERE i.reporting_date >= ${fromParam}::date AND i.reporting_date <= ${toParam}::date`)
      : sql`WHERE i.import_batch = ${batchId}::uuid`

    // Jami statistika
    const [totals] = await sql`
      SELECT
        COUNT(*)::int                                                                  AS row_count,
        COALESCE(SUM(i.gca_weight), 0)::numeric                                       AS total_weight,
        COUNT(DISTINCT i.vin)::int                                                     AS veh_count,
        COALESCE(SUM(CASE WHEN i.model_group='R7'  THEN i.gca_weight ELSE 0 END), 0) AS damas_weight,
        COALESCE(SUM(CASE WHEN i.model_group='R7A' THEN i.gca_weight ELSE 0 END), 0) AS labo_weight,
        COUNT(DISTINCT CASE WHEN i.model_group='R7'  THEN i.vin END)::int             AS damas_veh,
        COUNT(DISTINCT CASE WHEN i.model_group='R7A' THEN i.vin END)::int             AS labo_veh,
        MIN(i.reporting_date)::text  AS date_from,
        MAX(i.reporting_date)::text  AS date_to
      ${fromClause}
      ${whereClause}
    `

    if (!totals || Number(totals.row_count) === 0) {
      return NextResponse.json({ empty: true })
    }

    // WDPV = total_weight / veh_count
    const totalWeight = Number(totals.total_weight)
    const vehCount    = Number(totals.veh_count)
    const wdpv        = vehCount > 0 ? Math.round((totalWeight / vehCount) * 100) / 100 : 0

    // Sehlar bo'yicha (faktor taqsimoti bilan) — prod_team dan guruhlanadi
    const byShopRaw = await sql`
      SELECT
        CASE
          WHEN UPPER(i.prod_team) LIKE 'PA.%' OR UPPER(i.prod_team) = 'PA' THEN 'PAINT SHOP'
          WHEN UPPER(i.prod_team) LIKE 'BO.%' OR UPPER(i.prod_team) = 'BO' THEN 'WELDING'
          WHEN UPPER(i.prod_team) LIKE 'PR.%' OR UPPER(i.prod_team) = 'PR' THEN 'PRESS SHOP'
          WHEN UPPER(i.prod_team) LIKE 'GA.%' OR UPPER(i.prod_team) = 'GA' THEN 'GA'
          WHEN UPPER(i.prod_team) LIKE 'SQE.%' OR UPPER(i.prod_team) = 'SQE' THEN 'SQE'
          WHEN UPPER(i.prod_team) LIKE 'SQ.%'  OR UPPER(i.prod_team) = 'SQ'  THEN 'SQ'
          WHEN UPPER(i.prod_team) LIKE 'QE.%'  OR UPPER(i.prod_team) = 'QE'  THEN 'QE'
          WHEN UPPER(i.prod_team) LIKE 'SC.%'  OR UPPER(i.prod_team) = 'SC'  THEN 'SupplyChain'
          ELSE 'Boshqalar'
        END                                                                        AS shop,
        COUNT(*)::int                                                              AS row_count,
        COALESCE(SUM(i.gca_weight), 0)::numeric                                   AS total_weight,
        COUNT(DISTINCT i.vin)::int                                                 AS veh_count,
        COALESCE(SUM(CASE WHEN i.gca_weight = 50 THEN 1 ELSE 0 END), 0)::int      AS f50,
        COALESCE(SUM(CASE WHEN i.gca_weight = 20 THEN 1 ELSE 0 END), 0)::int      AS f20,
        COALESCE(SUM(CASE WHEN i.gca_weight = 10 THEN 1 ELSE 0 END), 0)::int      AS f10,
        COALESCE(SUM(CASE WHEN i.gca_weight = 5  THEN 1 ELSE 0 END), 0)::int      AS f5
      ${fromClause}
      ${whereClause}
      GROUP BY 1 ORDER BY total_weight DESC
    `
    // WDPV per shop = shop_total_weight / TOTAL inspected vehicles (not per-shop vehicles)
    const byShop = byShopRaw.map(r => ({
      ...r,
      total_weight: Number(r.total_weight),
      wdpv: vehCount > 0 ? Math.round((Number(r.total_weight) / vehCount) * 100) / 100 : 0,
    }))

    // Model bo'yicha
    const byModelRaw = await sql`
      SELECT
        i.model_label,
        i.model_group,
        COUNT(*)::int                  AS row_count,
        COALESCE(SUM(i.gca_weight), 0) AS total_weight,
        COUNT(DISTINCT i.vin)::int     AS veh_count
      ${fromClause}
      ${whereClause}
      GROUP BY i.model_label, i.model_group ORDER BY total_weight DESC
    `
    // WDPV per model = model_total_weight / TOTAL inspected vehicles
    const byModel = byModelRaw.map(r => ({
      ...r,
      total_weight: Number(r.total_weight),
      wdpv: vehCount > 0 ? Math.round((Number(r.total_weight) / vehCount) * 100) / 100 : 0,
    }))

    // Part Level 1 bo'yicha (top 10)
    const byPartLv1 = await sql`
      SELECT
        i.part_lv1,
        COUNT(*)::int                  AS row_count,
        COALESCE(SUM(i.gca_weight), 0) AS total_weight,
        COUNT(DISTINCT i.vin)::int     AS veh_count
      ${fromClause}
      ${whereClause}
        AND i.part_lv1 IS NOT NULL AND i.part_lv1 != ''
      GROUP BY i.part_lv1 ORDER BY total_weight DESC LIMIT 10
    `

    // Category bo'yicha
    const byCategory = await sql`
      SELECT
        i.category,
        COUNT(*)::int                  AS row_count,
        COALESCE(SUM(i.gca_weight), 0) AS total_weight
      ${fromClause}
      ${whereClause}
        AND i.category IS NOT NULL AND i.category != ''
      GROUP BY i.category ORDER BY total_weight DESC
    `

    // Top 10 nuqsonlar — fault_code bo'yicha
    const top10raw = await sql`
      SELECT
        i.fault_code,
        i.fault_name,
        i.prod_team,
        i.shop,
        i.part_lv1,
        COUNT(*)::int                                                                 AS row_count,
        COALESCE(SUM(i.gca_weight), 0)                                               AS group_weight,
        COUNT(DISTINCT i.vin)::int                                                   AS group_veh,
        COUNT(DISTINCT CASE WHEN i.model_group = 'R7'  THEN i.vin END)::int         AS veh_damas,
        COUNT(DISTINCT CASE WHEN i.model_group = 'R7A' THEN i.vin END)::int         AS veh_labo
      ${fromClause}
      ${whereClause}
      GROUP BY i.fault_code, i.fault_name, i.prod_team, i.shop, i.part_lv1
      ORDER BY SUM(i.gca_weight) DESC
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

    // Batch info — only in batch mode
    let batchInfo = null
    if (!isDateMode) {
      const [bi] = await sql`
        SELECT
          import_batch::text AS id,
          imported_at, imported_by, file_name,
          date_from::text, date_to::text,
          shift_from, shift_to
        FROM gca_import_batches
        WHERE import_batch = ${batchId}::uuid
      `
      batchInfo = bi ?? null
    }

    return NextResponse.json({
      batchId: isDateMode ? null : batchId,
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

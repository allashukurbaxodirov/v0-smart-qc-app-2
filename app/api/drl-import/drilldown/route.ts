import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string } } catch { return null }
}

/**
 * GET /api/drl-import/drilldown?batch=UUID&lv1=...
 * GET /api/drl-import/drilldown?from=2026-04-01&to=2026-04-30&lv1=...
 * GET /api/drl-import/drilldown?from=...&to=...&shift=A&lv1=...
 *
 * Returns flat rows for a given part_lv1 from drl_imports,
 * grouped for client-side tree building: lv2 → lv3 → lv4 → [ fault rows ]
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const batch = searchParams.get('batch')
  const lv1   = searchParams.get('lv1')
  const from  = searchParams.get('from')
  const to    = searchParams.get('to')
  const shift = searchParams.get('shift')  // A | B | D | null

  if (!lv1) {
    return NextResponse.json({ error: 'lv1 required' }, { status: 400 })
  }
  if (!batch && !(from && to)) {
    return NextResponse.json({ error: 'batch or from+to required' }, { status: 400 })
  }

  try {
    // Build WHERE clause depending on mode
    const needsJoin = !batch && !!shift
    const fromClause = needsJoin
      ? sql`FROM drl_imports i JOIN drl_import_batches b ON b.import_batch = i.import_batch`
      : sql`FROM drl_imports i`

    const whereClause = batch
      ? sql`WHERE i.import_batch = ${batch}::uuid AND i.part_lv1 = ${lv1}`
      : (shift
          ? sql`WHERE i.date_to >= ${from}::date AND i.date_from <= ${to}::date
                  AND b.shift_label = ${shift} AND i.part_lv1 = ${lv1}`
          : sql`WHERE i.date_to >= ${from}::date AND i.date_from <= ${to}::date
                  AND i.part_lv1 = ${lv1}`)

    const rows = await sql`
      SELECT
        COALESCE(i.part_lv2, '')        AS part_lv2,
        COALESCE(i.part_lv3, '')        AS part_lv3,
        COALESCE(i.part_lv4, '')        AS part_lv4,
        i.fault_code,
        i.fault_name,
        i.shop,
        i.prod_team,
        i.model_group,
        SUM(i.count)::int               AS total_count,
        COALESCE(SUM(i.veh_cnt), 0)::int AS total_veh,
        ROUND(SUM(i.drl_ratio), 2)      AS total_drl_ratio,
        SUM(CASE WHEN i.model_group='R7'  THEN i.count ELSE 0 END)::int AS model_damas,
        SUM(CASE WHEN i.model_group='R7A' THEN i.count ELSE 0 END)::int AS model_labo
      ${fromClause}
      ${whereClause}
      GROUP BY
        i.part_lv2, i.part_lv3, i.part_lv4,
        i.fault_code, i.fault_name,
        i.shop, i.prod_team, i.model_group
      ORDER BY SUM(i.count) DESC
    `

    const [totals] = await sql`
      SELECT
        SUM(i.count)::int               AS total_count,
        COALESCE(SUM(i.veh_cnt), 0)::int AS total_veh,
        ROUND(SUM(i.drl_ratio), 2)      AS total_drl_ratio
      ${fromClause}
      ${whereClause}
    `

    return NextResponse.json({ lv1, totals, rows })
  } catch (e: any) {
    console.error('drl drilldown error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

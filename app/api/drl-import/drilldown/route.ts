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
 * GET /api/drl-import/drilldown?batch=UUID&lv1=Doors+%2F+Gates
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

  if (!batch || !lv1) {
    return NextResponse.json({ error: 'batch and lv1 required' }, { status: 400 })
  }

  try {
    const rows = await sql`
      SELECT
        COALESCE(part_lv2, '')        AS part_lv2,
        COALESCE(part_lv3, '')        AS part_lv3,
        COALESCE(part_lv4, '')        AS part_lv4,
        fault_code,
        fault_name,
        shop,
        prod_team,
        model_group,
        SUM(count)::int               AS total_count,
        COALESCE(SUM(veh_cnt), 0)::int AS total_veh,
        ROUND(SUM(drl_ratio), 2)      AS total_drl_ratio,
        SUM(CASE WHEN model_group='R7'  THEN count ELSE 0 END)::int AS model_damas,
        SUM(CASE WHEN model_group='R7A' THEN count ELSE 0 END)::int AS model_labo
      FROM drl_imports
      WHERE import_batch = ${batch}::uuid
        AND part_lv1 = ${lv1}
      GROUP BY
        part_lv2, part_lv3, part_lv4,
        fault_code, fault_name,
        shop, prod_team, model_group
      ORDER BY SUM(count) DESC
    `

    // Summary totals for this lv1
    const [totals] = await sql`
      SELECT
        SUM(count)::int               AS total_count,
        COALESCE(SUM(veh_cnt), 0)::int AS total_veh,
        ROUND(SUM(drl_ratio), 2)      AS total_drl_ratio
      FROM drl_imports
      WHERE import_batch = ${batch}::uuid
        AND part_lv1 = ${lv1}
    `

    return NextResponse.json({ lv1, totals, rows })
  } catch (e: any) {
    console.error('drl drilldown error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

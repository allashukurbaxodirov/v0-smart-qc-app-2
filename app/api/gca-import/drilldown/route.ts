import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// GET /api/gca-import/drilldown?batch=UUID&lv1=Body+Surface
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const batchId = searchParams.get('batch')
  const lv1     = searchParams.get('lv1')

  if (!batchId || !lv1) return NextResponse.json({ error: 'batch va lv1 kerak' }, { status: 400 })

  try {
    const rows = await sql`
      SELECT
        part_lv2,
        part_lv3,
        fault_code,
        fault_name,
        defect_note,
        shop,
        gca_weight::float AS gca_weight,
        COUNT(DISTINCT vin)::int AS veh_count
      FROM gca_imports
      WHERE import_batch = ${batchId}::uuid
        AND part_lv1 = ${lv1}
      GROUP BY part_lv2, part_lv3, fault_code, fault_name, defect_note, shop, gca_weight
      ORDER BY gca_weight DESC, part_lv2, part_lv3, fault_name
    `
    return NextResponse.json({ lv1, rows })
  } catch (e: any) {
    console.error('gca drilldown error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

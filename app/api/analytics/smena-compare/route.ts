import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string } } catch { return null }
}

// GET /api/analytics/smena-compare?from=2026-04-01&to=2026-04-30
// Returns DRL + GCA totals grouped by shift A/B/D, plus DRR total (no shift yet)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  }

  try {
    // ── DRL: totals by shift ──────────────────────────────────────────────────
    const drlByShift = await sql`
      SELECT
        b.shift_label,
        SUM(i.count)::int                                                    AS total,
        SUM(CASE WHEN i.model_group='R7'  THEN i.count ELSE 0 END)::int     AS damas,
        SUM(CASE WHEN i.model_group='R7A' THEN i.count ELSE 0 END)::int     AS labo
      FROM drl_imports i
      JOIN drl_import_batches b ON b.import_batch = i.import_batch
      WHERE b.shift_label IN ('A','B','D')
        AND i.date_to >= ${from}::date AND i.date_from <= ${to}::date
      GROUP BY b.shift_label
    `

    // ── DRL: by shift + shop ──────────────────────────────────────────────────
    const drlByShiftShop = await sql`
      SELECT b.shift_label, i.shop, SUM(i.count)::int AS total
      FROM drl_imports i
      JOIN drl_import_batches b ON b.import_batch = i.import_batch
      WHERE b.shift_label IN ('A','B','D')
        AND i.date_to >= ${from}::date AND i.date_from <= ${to}::date
      GROUP BY b.shift_label, i.shop
      ORDER BY b.shift_label, total DESC
    `

    // ── DRL: top faults by shift (for quick insight) ──────────────────────────
    const drlTop5ByShift = await sql`
      SELECT b.shift_label, i.fault_code, i.fault_name, SUM(i.count)::int AS total
      FROM drl_imports i
      JOIN drl_import_batches b ON b.import_batch = i.import_batch
      WHERE b.shift_label IN ('A','B','D')
        AND i.date_to >= ${from}::date AND i.date_from <= ${to}::date
      GROUP BY b.shift_label, i.fault_code, i.fault_name
      ORDER BY b.shift_label, total DESC
    `

    // ── GCA: totals by shift ──────────────────────────────────────────────────
    const gcaByShift = await sql`
      SELECT
        b.shift_label,
        ROUND(SUM(i.gca_weight)::numeric, 1)     AS total_weight,
        COUNT(DISTINCT i.vin)::int                AS veh_count,
        ROUND(SUM(CASE WHEN i.model_group='R7'  THEN i.gca_weight ELSE 0 END)::numeric, 1) AS damas_weight,
        ROUND(SUM(CASE WHEN i.model_group='R7A' THEN i.gca_weight ELSE 0 END)::numeric, 1) AS labo_weight,
        COUNT(DISTINCT CASE WHEN i.model_group='R7'  THEN i.vin END)::int AS damas_veh,
        COUNT(DISTINCT CASE WHEN i.model_group='R7A' THEN i.vin END)::int AS labo_veh
      FROM gca_imports i
      JOIN gca_import_batches b ON b.import_batch = i.import_batch
      WHERE b.shift_label IN ('A','B','D')
        AND i.reporting_date >= ${from}::date AND i.reporting_date <= ${to}::date
      GROUP BY b.shift_label
    `

    // ── GCA: by shift + shop ──────────────────────────────────────────────────
    const gcaByShiftShop = await sql`
      SELECT
        b.shift_label, i.prod_team AS shop,
        ROUND(SUM(i.gca_weight)::numeric, 1) AS total_weight,
        COUNT(DISTINCT i.vin)::int            AS veh_count
      FROM gca_imports i
      JOIN gca_import_batches b ON b.import_batch = i.import_batch
      WHERE b.shift_label IN ('A','B','D')
        AND i.reporting_date >= ${from}::date AND i.reporting_date <= ${to}::date
      GROUP BY b.shift_label, i.prod_team
      ORDER BY b.shift_label, total_weight DESC
    `

    // ── DRR: total + byShop (no shift split yet) ──────────────────────────────
    const [drrTotals] = await sql`
      SELECT
        COALESCE(SUM(count), 0)::int   AS total,
        COALESCE(SUM(veh_cnt), 0)::int AS veh_total
      FROM drr_imports
      WHERE date_to >= ${from}::date AND date_from <= ${to}::date
    `
    const drrByShop = await sql`
      SELECT shop, SUM(count)::int AS total, SUM(veh_cnt)::int AS veh_total
      FROM drr_imports
      WHERE date_to >= ${from}::date AND date_from <= ${to}::date
      GROUP BY shop ORDER BY total DESC
    `

    // ── Build structured response ─────────────────────────────────────────────
    const SHIFTS = ['A','B','D'] as const

    const drl: Record<string, any> = {}
    for (const s of SHIFTS) {
      const row = drlByShift.find(r => r.shift_label === s)
      drl[s] = {
        total: Number(row?.total ?? 0),
        damas: Number(row?.damas ?? 0),
        labo:  Number(row?.labo  ?? 0),
        byShop: drlByShiftShop
          .filter(r => r.shift_label === s)
          .map(r => ({ shop: r.shop, total: Number(r.total) })),
        top5: drlTop5ByShift
          .filter(r => r.shift_label === s)
          .slice(0, 5)
          .map(r => ({ fault_code: r.fault_code, fault_name: r.fault_name, total: Number(r.total) })),
      }
    }

    const gca: Record<string, any> = {}
    for (const s of SHIFTS) {
      const row = gcaByShift.find(r => r.shift_label === s)
      const w = Number(row?.total_weight ?? 0)
      const v = Number(row?.veh_count ?? 0)
      gca[s] = {
        total_weight: w,
        veh_count:    v,
        wdpv:         v > 0 ? Math.round((w / v) * 100) / 100 : 0,
        damas_weight: Number(row?.damas_weight ?? 0),
        labo_weight:  Number(row?.labo_weight  ?? 0),
        damas_veh:    Number(row?.damas_veh    ?? 0),
        labo_veh:     Number(row?.labo_veh     ?? 0),
        byShop: gcaByShiftShop
          .filter(r => r.shift_label === s)
          .map(r => ({
            shop:         r.shop,
            total_weight: Number(r.total_weight),
            veh_count:    Number(r.veh_count),
            wdpv:         Number(r.veh_count) > 0
              ? Math.round((Number(r.total_weight) / Number(r.veh_count)) * 100) / 100
              : 0,
          })),
      }
    }

    return NextResponse.json({
      period: { from, to },
      drl,
      gca,
      drr: {
        total:     Number(drrTotals?.total     ?? 0),
        veh_total: Number(drrTotals?.veh_total ?? 0),
        byShop: drrByShop.map(r => ({
          shop:      r.shop,
          total:     Number(r.total),
          veh_total: Number(r.veh_total),
        })),
      },
    })
  } catch (e: any) {
    console.error('analytics/smena-compare error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

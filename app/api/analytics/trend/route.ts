import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string } } catch { return null }
}

// GET /api/analytics/trend?from=2025-01-01&to=2026-12-31
// Returns monthly DRL + DRR + GCA aggregates for trend charts
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? '2025-01-01'
  const to   = searchParams.get('to')   ?? new Date().toISOString().slice(0, 10)

  try {
    // ── DRL monthly (group by batch date_from month) ──────────────────────────
    const drlMonthly = await sql`
      SELECT
        TO_CHAR(b.date_from, 'YYYY-MM')                                   AS month,
        SUM(i.count)::int                                                  AS drl_total,
        SUM(CASE WHEN i.model_group='R7'  THEN i.count ELSE 0 END)::int   AS drl_damas,
        SUM(CASE WHEN i.model_group='R7A' THEN i.count ELSE 0 END)::int   AS drl_labo,
        STRING_AGG(DISTINCT COALESCE(b.shift_label, 'X'), ',')            AS shifts
      FROM drl_imports i
      JOIN drl_import_batches b ON b.import_batch = i.import_batch
      WHERE b.date_from >= ${from}::date AND b.date_from <= ${to}::date
      GROUP BY TO_CHAR(b.date_from, 'YYYY-MM')
      ORDER BY month
    `

    // ── DRL shop breakdown by month ───────────────────────────────────────────
    const drlShopMonthly = await sql`
      SELECT
        TO_CHAR(b.date_from, 'YYYY-MM') AS month,
        i.shop,
        SUM(i.count)::int AS total
      FROM drl_imports i
      JOIN drl_import_batches b ON b.import_batch = i.import_batch
      WHERE b.date_from >= ${from}::date AND b.date_from <= ${to}::date
      GROUP BY TO_CHAR(b.date_from, 'YYYY-MM'), i.shop
      ORDER BY month, total DESC
    `

    // ── DRR monthly ───────────────────────────────────────────────────────────
    const drrMonthly = await sql`
      SELECT
        TO_CHAR(date_from, 'YYYY-MM')     AS month,
        SUM(count)::int                   AS drr_total,
        COALESCE(SUM(veh_cnt), 0)::int    AS drr_veh
      FROM drr_imports
      WHERE date_from >= ${from}::date AND date_from <= ${to}::date
      GROUP BY TO_CHAR(date_from, 'YYYY-MM')
      ORDER BY month
    `

    // ── GCA monthly ───────────────────────────────────────────────────────────
    const gcaMonthly = await sql`
      SELECT
        TO_CHAR(b.date_from, 'YYYY-MM')              AS month,
        ROUND(SUM(i.gca_weight)::numeric, 1)          AS gca_weight,
        COUNT(DISTINCT i.vin)::int                    AS veh_count
      FROM gca_imports i
      JOIN gca_import_batches b ON b.import_batch = i.import_batch
      WHERE b.date_from >= ${from}::date AND b.date_from <= ${to}::date
      GROUP BY TO_CHAR(b.date_from, 'YYYY-MM')
      ORDER BY month
    `

    // ── Merge into a single timeline ──────────────────────────────────────────
    const allMonths = new Set<string>([
      ...drlMonthly.map((r: any) => r.month),
      ...drrMonthly.map((r: any) => r.month),
      ...gcaMonthly.map((r: any) => r.month),
    ])

    const drlMap  = Object.fromEntries(drlMonthly.map((r: any) => [r.month, r]))
    const drrMap  = Object.fromEntries(drrMonthly.map((r: any) => [r.month, r]))
    const gcaMap  = Object.fromEntries(gcaMonthly.map((r: any) => [r.month, r]))

    const monthly = [...allMonths].sort().map(m => {
      const d = drlMap[m]
      const r = drrMap[m]
      const g = gcaMap[m]
      const gw = Number(g?.gca_weight ?? 0)
      const gv = Number(g?.veh_count  ?? 0)
      return {
        month:      m,
        drl:        Number(d?.drl_total ?? 0),
        drl_damas:  Number(d?.drl_damas ?? 0),
        drl_labo:   Number(d?.drl_labo  ?? 0),
        drr:        Number(r?.drr_total ?? 0),
        drr_veh:    Number(r?.drr_veh   ?? 0),
        gca_weight: gw,
        gca_veh:    gv,
        gca_wdpv:   gv > 0 ? Math.round((gw / gv) * 100) / 100 : 0,
      }
    })

    // ── DRL shop monthly breakdown ────────────────────────────────────────────
    const shopMonthly: Record<string, { month: string; shop: string; total: number }[]> = {}
    for (const row of drlShopMonthly as any[]) {
      const key = row.shop as string
      if (!shopMonthly[key]) shopMonthly[key] = []
      shopMonthly[key].push({ month: row.month, shop: row.shop, total: Number(row.total) })
    }

    return NextResponse.json({ monthly, shopMonthly })
  } catch (e: any) {
    console.error('analytics/trend error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

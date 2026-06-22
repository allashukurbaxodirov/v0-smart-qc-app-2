import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { parseGsipGCA } from '@/lib/gca-parser'
import { SHOP_ROLE_MAP } from '@/app/api/escalations/route'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name?: string; email?: string; tabelNumber?: string; shift?: string | null } }
  catch { return null }
}

// ─── GET — import batch list ──────────────────────────────────────────────────
export async function GET() {
  try {
    const batches = await sql`
      SELECT
        import_batch::text AS id,
        imported_at,
        imported_by,
        file_name,
        date_from::text,
        date_to::text,
        shift_from,
        shift_to,
        shift_label,
        row_count,
        total_weight,
        veh_count,
        status
      FROM gca_import_batches
      ORDER BY imported_at DESC
      LIMIT 20
    `
    return NextResponse.json(batches)
  } catch (e: any) {
    console.error('gca-import GET error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── POST — upload + parse + insert ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fayl yuklanmadi' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = parseGsipGCA(buffer)

    if (result.rawCount === 0) {
      return NextResponse.json(
        { error: result.warnings[0] ?? "Fayl bo'sh yoki format noto'g'ri" },
        { status: 422 }
      )
    }

    const { meta, rows, totalWeight, vehCount } = result
    const importedBy  = session.name ?? session.email ?? 'unknown'
    const shiftLabel  = session.shift ?? null

    // 1. Create batch record
    const [batch] = await sql`
      INSERT INTO gca_import_batches
        (imported_by, file_name, date_from, date_to, shift_from, shift_to,
         shift_label, row_count, total_weight, veh_count)
      VALUES
        (${importedBy}, ${file.name},
         ${meta.dateFrom}::date, ${meta.dateTo}::date,
         ${meta.shiftFrom}, ${meta.shiftTo},
         ${shiftLabel},
         ${rows.length}, ${totalWeight}, ${vehCount})
      RETURNING import_batch::text AS id
    `
    const batchId = batch.id

    // 2. Bulk insert rows (chunks of 200) — DRR/DRL bilan bir xil pattern
    const CHUNK = 200
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      // eslint-disable-next-line no-await-in-loop
      await sql`
        INSERT INTO gca_imports ${sql(chunk.map(r => ({
          import_batch:   batchId,
          reporting_date: r.reportingDate || null,
          part_lv1:       r.partLv1   || null,
          part_lv2:       r.partLv2   || null,
          part_lv3:       r.partLv3   || null,
          part_lv4:       r.partLv4   || null,
          part_lv5:       r.partLv5   || null,
          fault_code:     r.faultCode || null,
          fault_name:     r.faultName || null,
          gca_weight:     r.gcaWeight,
          defect_note:    r.defectNote || null,
          fault_desc:     r.faultDesc  || null,
          zone_desc:      r.zoneDesc   || null,
          category:       r.category   || null,
          prod_team:      r.prodTeam   || null,
          shop:           r.shop       || null,
          seq_no:         r.seqNo      || null,
          vin:            r.vin        || null,
          model_group:    r.modelGroup || null,
          model_label:    r.modelLabel || null,
        })))}
      `
    }

    // ── Auto-escalation: GCA weight >= 20 bo'lgan nuqsonlar ──────────────────
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS escalations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source TEXT NOT NULL DEFAULT 'gca',
          import_batch UUID, fault_code TEXT NOT NULL DEFAULT '—',
          fault_name TEXT NOT NULL, shop TEXT NOT NULL, prod_team TEXT,
          total_count INT NOT NULL DEFAULT 0, total_weight NUMERIC DEFAULT 0,
          drl_ratio NUMERIC, model_damas INT DEFAULT 0, model_labo INT DEFAULT 0,
          assigned_role TEXT NOT NULL DEFAULT 'ga_engineer', assigned_name TEXT,
          priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open',
          engineer_note TEXT, root_cause TEXT, action_taken TEXT,
          transfer_to TEXT, transfer_reason TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          resolved_at TIMESTAMPTZ, due_date DATE,
          created_by TEXT, created_by_name TEXT
        )
      `
      const topFaults = await sql`
        SELECT
          CASE
            WHEN UPPER(prod_team) LIKE 'PA.%' OR UPPER(prod_team) = 'PA' THEN 'PAINT SHOP'
            WHEN UPPER(prod_team) LIKE 'BO.%' OR UPPER(prod_team) = 'BO' THEN 'WELDING'
            WHEN UPPER(prod_team) LIKE 'PR.%' OR UPPER(prod_team) = 'PR' THEN 'PRESS SHOP'
            WHEN UPPER(prod_team) LIKE 'GA.%' OR UPPER(prod_team) = 'GA' THEN 'GA'
            WHEN UPPER(prod_team) LIKE 'SQE.%' OR UPPER(prod_team) = 'SQE' THEN 'SQE'
            WHEN UPPER(prod_team) LIKE 'QE.%' OR UPPER(prod_team) = 'QE' THEN 'QE'
            WHEN UPPER(prod_team) LIKE 'PE.%' OR UPPER(prod_team) = 'PE' THEN 'PE'
            ELSE COALESCE(shop, 'GA')
          END AS resolved_shop,
          fault_code,
          fault_name,
          prod_team,
          COUNT(*)::int                      AS row_count,
          SUM(gca_weight)::numeric           AS total_weight,
          COUNT(DISTINCT vin)::int           AS veh_count,
          COUNT(DISTINCT CASE WHEN model_group='R7'  THEN vin END)::int AS model_damas,
          COUNT(DISTINCT CASE WHEN model_group='R7A' THEN vin END)::int AS model_labo
        FROM gca_imports
        WHERE import_batch = ${batchId}::uuid
          AND gca_weight >= 20
          AND fault_code IS NOT NULL AND fault_code != ''
        GROUP BY resolved_shop, fault_code, fault_name, prod_team
        HAVING SUM(gca_weight) >= 20
        ORDER BY SUM(gca_weight) DESC
        LIMIT 30
      `
      for (const f of topFaults) {
        const shopKey = f.resolved_shop as string
        const role = SHOP_ROLE_MAP[shopKey] ?? 'ga_engineer'
        const w = Number(f.total_weight)
        const prio = w >= 200 ? 'critical' : w >= 100 ? 'high' : w >= 50 ? 'medium' : 'low'
        const [ex] = await sql`
          SELECT id FROM escalations
          WHERE fault_code = ${f.fault_code} AND shop = ${shopKey}
            AND source = 'gca' AND status NOT IN ('resolved','cancelled')
          LIMIT 1
        `
        if (ex) {
          await sql`
            UPDATE escalations SET
              total_weight = GREATEST(total_weight, ${w}),
              updated_at   = NOW()
            WHERE id = ${ex.id}::uuid
          `
        } else {
          await sql`
            INSERT INTO escalations
              (source, import_batch, fault_code, fault_name, shop, prod_team,
               total_count, total_weight, model_damas, model_labo,
               assigned_role, priority, created_by_name)
            VALUES
              ('gca', ${batchId}::uuid, ${f.fault_code}, ${f.fault_name},
               ${shopKey}, ${f.prod_team ?? null},
               ${f.veh_count}, ${w},
               ${f.model_damas}, ${f.model_labo},
               ${role}, ${prio}, ${importedBy})
          `
        }
      }
    } catch (escErr) {
      console.warn('GCA auto-escalation error:', (escErr as Error).message)
    }

    return NextResponse.json({
      ok:          true,
      batchId,
      rowCount:    rows.length,
      totalWeight,
      vehCount,
      skipped:     result.skipped,
      warnings:    result.warnings,
      meta,
    }, { status: 201 })

  } catch (e: any) {
    console.error('gca-import POST error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── DELETE — batch o'chirish ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('batch')
  if (!id) return NextResponse.json({ error: 'batch ID kerak' }, { status: 400 })

  await sql`DELETE FROM gca_import_batches WHERE import_batch = ${id}::uuid`
  return NextResponse.json({ ok: true })
}

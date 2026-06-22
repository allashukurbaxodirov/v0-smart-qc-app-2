import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { parseGsipDRR } from '@/lib/gsip-drr-parser'
import { SHOP_ROLE_MAP } from '@/app/api/escalations/route'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name: string } } catch { return null }
}

// ─── GET: Import batches list ──────────────────────────────────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const batches = await sql`
      SELECT import_batch, imported_at, imported_by, file_name,
             date_from::text, date_to::text, shift_from, shift_to,
             row_count, total_count, models, status, shift_label
      FROM drr_import_batches
      ORDER BY imported_at DESC
      LIMIT 50
    `
    return NextResponse.json(batches)
  } catch (e) {
    console.error('drr-import GET error:', (e as Error).message)
    return NextResponse.json([], { status: 200 })
  }
}

// ─── POST: Upload & parse Excel ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin', 'drr_inspector'].includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
  }

  try {
    const formData   = await req.formData()
    const file       = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 })
    const shiftLabel = (formData.get('shift_label') as string | null)?.trim() || null  // A | B | D | null

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = parseGsipDRR(buffer)
    const { meta, rows, top10, skipped, warnings, rawCount } = result

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Faylda ma\'lumot topilmadi' }, { status: 400 })
    }

    const totalCount = rows.reduce((s, r) => s + r.count, 0)
    const totalVeh   = rows.reduce((s, r) => s + r.vehCnt, 0)
    const models     = [...new Set(rows.map(r => r.modelLabel))].join(', ')

    // Ensure shift_label column exists (idempotent)
    try {
      await sql`ALTER TABLE drr_import_batches ADD COLUMN IF NOT EXISTS shift_label TEXT`
    } catch {}

    // 1. AVVAL batch yaratiladi (foreign key shart)
    const [batchRow] = await sql`
      INSERT INTO drr_import_batches
        (imported_by, file_name,
         date_from, date_to, shift_from, shift_to,
         row_count, total_count, models, shift_label)
      VALUES
        (${session.name}, ${file.name},
         ${meta.dateFrom}::date, ${meta.dateTo}::date,
         ${meta.shiftFrom}, ${meta.shiftTo},
         ${rows.length}, ${totalCount}, ${models}, ${shiftLabel})
      RETURNING import_batch
    `
    const importBatch = batchRow.import_batch

    // 2. KEYIN qatorlar kiritiladi
    const CHUNK = 200
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      await sql`
        INSERT INTO drr_imports ${sql(chunk.map(r => ({
          import_batch: importBatch,
          imported_by:  session.name,
          file_name:    file.name,
          date_from:    meta.dateFrom,
          date_to:      meta.dateTo,
          shift_from:   meta.shiftFrom,
          shift_to:     meta.shiftTo,
          row_type:     r.rowType,
          model_group:  r.modelGroup,
          model_label:  r.modelLabel,
          part_lv1:     r.partLv1 || null,
          part_lv2:     r.partLv2 || null,
          part_lv3:     r.partLv3 || null,
          part_lv4:     r.partLv4 || null,
          fault_id:     r.faultId,
          fault_code:   r.faultCode,
          fault_name:   r.faultName,
          defect_note:  r.defectNote || null,
          crew:         r.crew || null,
          prod_team:    r.prodTeam || null,
          shop:         r.shop,
          count:        r.count,
          drr_ratio:    0,
          veh_cnt:      r.vehCnt,
        })))}
      `
    }

    // ── Auto-escalation: shop+fault_code bo'yicha guruhlab, threshold >= 5 ──
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS escalations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source TEXT NOT NULL DEFAULT 'drl',
          import_batch UUID,
          fault_code TEXT NOT NULL DEFAULT '—',
          fault_name TEXT NOT NULL,
          shop TEXT NOT NULL,
          prod_team TEXT,
          total_count INT NOT NULL DEFAULT 0,
          total_weight NUMERIC DEFAULT 0,
          drl_ratio NUMERIC,
          model_damas INT DEFAULT 0,
          model_labo INT DEFAULT 0,
          assigned_role TEXT NOT NULL DEFAULT 'ga_engineer',
          assigned_name TEXT,
          priority TEXT NOT NULL DEFAULT 'medium',
          status TEXT NOT NULL DEFAULT 'open',
          engineer_note TEXT,
          root_cause TEXT,
          action_taken TEXT,
          transfer_to TEXT,
          transfer_reason TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          resolved_at TIMESTAMPTZ,
          due_date DATE,
          created_by TEXT,
          created_by_name TEXT
        )
      `
      // Top nuqsonlarni guruhlab auto-escalation yaratish
      const topFaults = await sql`
        SELECT
          shop,
          fault_code,
          fault_name,
          prod_team,
          SUM(count)::int         AS total_count,
          SUM(CASE WHEN model_group='R7'  THEN count ELSE 0 END)::int AS model_damas,
          SUM(CASE WHEN model_group='R7A' THEN count ELSE 0 END)::int AS model_labo
        FROM drr_imports
        WHERE import_batch = ${importBatch}::uuid
          AND shop IS NOT NULL AND shop != ''
        GROUP BY shop, fault_code, fault_name, prod_team
        HAVING SUM(count) >= 5
        ORDER BY SUM(count) DESC
        LIMIT 30
      `
      for (const f of topFaults) {
        const role = SHOP_ROLE_MAP[f.shop] ?? 'ga_engineer'
        const prio = f.total_count >= 50 ? 'critical' : f.total_count >= 20 ? 'high' : 'medium'
        // Mavjud ochiq eskalatsiya bo'lsa yangilash, yo'qsa yaratish
        const [ex] = await sql`
          SELECT id FROM escalations
          WHERE fault_code = ${f.fault_code} AND shop = ${f.shop}
            AND source = 'drr' AND status NOT IN ('resolved','cancelled')
          LIMIT 1
        `
        if (ex) {
          await sql`
            UPDATE escalations SET
              total_count = GREATEST(total_count, ${f.total_count}),
              updated_at  = NOW()
            WHERE id = ${ex.id}::uuid
          `
        } else {
          await sql`
            INSERT INTO escalations
              (source, import_batch, fault_code, fault_name, shop, prod_team,
               total_count, model_damas, model_labo, assigned_role, priority,
               created_by_name)
            VALUES
              ('drr', ${importBatch}::uuid, ${f.fault_code}, ${f.fault_name},
               ${f.shop}, ${f.prod_team ?? null},
               ${f.total_count}, ${f.model_damas}, ${f.model_labo},
               ${role}, ${prio}, ${session.name})
          `
        }
      }
    } catch (escErr) {
      console.warn('DRR auto-escalation error:', (escErr as Error).message)
    }

    return NextResponse.json({
      ok:          true,
      importBatch,
      rowCount:    rows.length,
      rawCount,
      totalCount,
      totalVeh,
      skipped,
      warnings,
      meta,
      top10,
    })
  } catch (e: any) {
    console.error('drr-import POST error:', e.message)
    return NextResponse.json({ error: e.message ?? 'Server xatosi' }, { status: 500 })
  }
}

// ─── DELETE: Remove a batch ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin', 'drr_inspector'].includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const importBatch = searchParams.get('batch')
  if (!importBatch) return NextResponse.json({ error: 'batch required' }, { status: 400 })

  try {
    await sql`DELETE FROM drr_imports        WHERE import_batch = ${importBatch}::uuid`
    await sql`DELETE FROM drr_import_batches WHERE import_batch = ${importBatch}::uuid`
    await sql`UPDATE drr_escalations SET status = 'cancelled' WHERE import_batch = ${importBatch}::uuid`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

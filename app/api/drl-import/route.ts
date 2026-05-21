import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { parseGsipPareto, prodTeamToShop, countToPriority, prodTeamToRole } from '@/lib/gsip-pareto-parser'

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
             row_count, total_count, models, status
      FROM drl_import_batches
      ORDER BY imported_at DESC
      LIMIT 50
    `
    return NextResponse.json(batches)
  } catch (e) {
    console.error('drl-import GET error:', (e as Error).message)
    return NextResponse.json([], { status: 200 })
  }
}

// ─── POST: Upload & parse Excel ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 })

    const buffer   = Buffer.from(await file.arrayBuffer())
    const result   = parseGsipPareto(buffer)
    const { meta, rows, top10, skipped, warnings } = result

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Faylda ma\'lumot topilmadi' }, { status: 400 })
    }

    // Generate batch UUID
    const [batchRow] = await sql`SELECT gen_random_uuid() AS id`
    const importBatch = batchRow.id

    // Bulk insert rows in chunks of 200
    const CHUNK = 200
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      await sql`
        INSERT INTO drl_imports ${sql(chunk.map(r => ({
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
          prod_team:    r.prodTeam || null,
          shop:         r.shop,
          count:        r.count,
          drl_ratio:    r.drlRatio,
          veh_cnt:      r.vehCnt,
        })))}
      `
    }

    const totalCount = rows.reduce((s, r) => s + r.count, 0)
    const models     = [...new Set(rows.map(r => r.modelLabel))].join(', ')

    // Save batch summary
    await sql`
      INSERT INTO drl_import_batches
        (import_batch, imported_by, file_name,
         date_from, date_to, shift_from, shift_to,
         row_count, total_count, models)
      VALUES
        (${importBatch}, ${session.name}, ${file.name},
         ${meta.dateFrom}::date, ${meta.dateTo}::date,
         ${meta.shiftFrom}, ${meta.shiftTo},
         ${rows.length}, ${totalCount}, ${models})
    `

    return NextResponse.json({
      ok:          true,
      importBatch,
      rowCount:    rows.length,
      totalCount,
      skipped,
      warnings,
      meta,
      top10,
    })
  } catch (e: any) {
    console.error('drl-import POST error:', e.message)
    return NextResponse.json({ error: e.message ?? 'Server xatosi' }, { status: 500 })
  }
}

// ─── DELETE: Remove a batch ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const importBatch = searchParams.get('batch')
  if (!importBatch) return NextResponse.json({ error: 'batch required' }, { status: 400 })

  try {
    await sql`DELETE FROM drl_imports        WHERE import_batch = ${importBatch}::uuid`
    await sql`DELETE FROM drl_import_batches WHERE import_batch = ${importBatch}::uuid`
    await sql`UPDATE drl_escalations SET status = 'cancelled' WHERE import_batch = ${importBatch}::uuid`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

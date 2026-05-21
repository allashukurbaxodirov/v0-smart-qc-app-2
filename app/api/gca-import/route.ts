import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { parseGsipGCA } from '@/lib/gca-parser'

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

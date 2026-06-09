import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { parseGsipDRRBySmena, ShiftCalendar } from '@/lib/gsip-drr-parser'

async function getSession() {
  const cs  = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name: string } } catch { return null }
}

// ─── POST: Oylik hisobot — smena jadvali bilan import ─────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'Faqat SuperAdmin bajarishi mumkin' }, { status: 403 })
  }

  try {
    const formData     = await req.formData()
    const file         = formData.get('file')     as File   | null
    const calendarJson = formData.get('calendar') as string | null

    if (!file)         return NextResponse.json({ error: 'Excel fayl topilmadi' },   { status: 400 })
    if (!calendarJson) return NextResponse.json({ error: 'Smena jadvali topilmadi' }, { status: 400 })

    const calendar: ShiftCalendar = JSON.parse(calendarJson)
    const buffer = Buffer.from(await file.arrayBuffer())

    const { meta, bySmena, warnings, totalRaw, totalSkipped } =
      parseGsipDRRBySmena(buffer, calendar)

    if (totalRaw === 0) {
      return NextResponse.json(
        { error: 'Smena jadvali mos kelmadi yoki faylda ma\'lumot topilmadi', warnings },
        { status: 400 },
      )
    }

    // Ensure shift_label column exists
    try {
      await sql`ALTER TABLE drr_import_batches ADD COLUMN IF NOT EXISTS shift_label TEXT`
    } catch {}

    const results: Record<string, {
      importBatch: string; rowCount: number; rawCount: number
      totalCount: number; totalVeh: number
    }> = {}

    for (const [smena, { rows, rawCount }] of Object.entries(bySmena)) {
      if (rows.length === 0) continue

      const totalCount = rows.reduce((s, r) => s + r.count,  0)
      const totalVeh   = rows.reduce((s, r) => s + r.vehCnt, 0)
      const models     = [...new Set(rows.map(r => r.modelLabel))].join(', ')

      const [batchRow] = await sql`
        INSERT INTO drr_import_batches
          (imported_by, file_name,
           date_from, date_to, shift_from, shift_to,
           row_count, total_count, models, shift_label)
        VALUES
          (${session.name}, ${file.name},
           ${meta.dateFrom}::date, ${meta.dateTo}::date,
           ${meta.shiftFrom}, ${meta.shiftTo},
           ${rows.length}, ${totalCount}, ${models}, ${smena})
        RETURNING import_batch
      `
      const importBatch = batchRow.import_batch

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

      results[smena] = { importBatch, rowCount: rows.length, rawCount, totalCount, totalVeh }
    }

    return NextResponse.json({
      ok: true,
      meta,
      results,
      warnings,
      totalRaw,
      totalSkipped,
    })
  } catch (e: any) {
    console.error('drr-import/monthly POST error:', e.message)
    return NextResponse.json({ error: e.message ?? 'Server xatosi' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'
import { parseGCABySmena } from '@/lib/gca-parser'
import type { ShiftCalendar } from '@/lib/gsip-drr-parser'

async function getSession() {
  const cs  = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name: string } } catch { return null }
}

// ─── POST: Oylik GCA hisobot — smena jadvali bilan import ─────────────────────
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
      parseGCABySmena(buffer, calendar)

    if (totalRaw === 0) {
      return NextResponse.json(
        { error: 'Smena jadvali mos kelmadi yoki faylda GCA ma\'lumoti topilmadi', warnings },
        { status: 400 },
      )
    }

    // Smena kalendarini DB ga saqlash (factory-wide — drr_monthly_calendars)
    const firstDate = Object.keys(calendar).sort()[0] ?? ''
    const calYear   = firstDate ? Number(firstDate.slice(0, 4)) : new Date().getFullYear()
    const calMonth  = firstDate ? Number(firstDate.slice(5, 7)) : new Date().getMonth() + 1
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS drr_monthly_calendars (
          id SERIAL PRIMARY KEY, year INT NOT NULL, month INT NOT NULL,
          calendar JSONB NOT NULL, updated_at TIMESTAMP DEFAULT NOW(), updated_by TEXT,
          UNIQUE(year, month)
        )
      `
      await sql`
        INSERT INTO drr_monthly_calendars (year, month, calendar, updated_at, updated_by)
        VALUES (${calYear}, ${calMonth}, ${JSON.stringify(calendar)}, NOW(), ${session.name})
        ON CONFLICT (year, month) DO UPDATE
          SET calendar=EXCLUDED.calendar, updated_at=NOW(), updated_by=EXCLUDED.updated_by
      `
    } catch { /* saqlay olmasa ham import davom etadi */ }

    // Ensure shift_label column exists
    try { await sql`ALTER TABLE gca_import_batches ADD COLUMN IF NOT EXISTS shift_label TEXT` } catch {}

    const results: Record<string, {
      importBatch: string; rowCount: number; rawCount: number
      totalWeight: number; vehCount: number
    }> = {}

    for (const [smena, { rows, rawCount, totalWeight, vehCount }] of Object.entries(bySmena)) {
      if (rows.length === 0) continue

      const models = [...new Set(rows.map(r => r.modelLabel))].join(', ')

      const [batchRow] = await sql`
        INSERT INTO gca_import_batches
          (imported_by, file_name,
           date_from, date_to, shift_from, shift_to,
           row_count, total_weight, veh_count, shift_label)
        VALUES
          (${session.name}, ${file.name},
           ${meta.dateFrom}::date, ${meta.dateTo}::date,
           ${meta.shiftFrom}, ${meta.shiftTo},
           ${rows.length}, ${totalWeight}, ${vehCount}, ${smena})
        RETURNING import_batch::text AS id
      `
      const importBatch = batchRow.id

      const CHUNK = 200
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        await sql`
          INSERT INTO gca_imports ${sql(chunk.map(r => ({
            import_batch:   importBatch,
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

      results[smena] = { importBatch, rowCount: rows.length, rawCount, totalWeight, vehCount }
    }

    return NextResponse.json({ ok: true, meta, results, warnings, totalRaw, totalSkipped })
  } catch (e: any) {
    console.error('gca-import/monthly POST error:', e.message)
    return NextResponse.json({ error: e.message ?? 'Server xatosi' }, { status: 500 })
  }
}

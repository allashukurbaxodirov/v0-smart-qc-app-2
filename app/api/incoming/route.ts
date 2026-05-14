import { NextResponse } from 'next/server'
import sql from '@/lib/db'

interface CachedIncoming {
  id: string
  part_number: string
  warehouse: string
  supplier: string
  part_name: string
  total_count: number
  defect_count: number
  defect_code: string | null
  defect_code_name: string | null
  defect_reason: string | null
  shift: string
  date: string
  created_by_name: string | null
}

const memCache: CachedIncoming[] = []

function toClient(r: CachedIncoming) {
  return {
    id:             r.id,
    partNumber:     r.part_number,
    warehouse:      r.warehouse,
    supplier:       r.supplier,
    partName:       r.part_name,
    totalCount:     r.total_count,
    defectCount:    r.defect_count,
    defectCode:     r.defect_code,
    defectCodeName: r.defect_code_name,
    defectReason:   r.defect_reason,
    shift:          r.shift,
    date:           r.date,
    createdByName:  r.created_by_name,
  }
}

// ─── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, part_number, warehouse, supplier, part_name,
             total_count, defect_count,
             defect_code, defect_code_name, defect_reason,
             shift, date::text, created_by_name
      FROM incoming_records
      ORDER BY created_at DESC
      LIMIT 500
    `
    for (const row of rows) {
      const rec: CachedIncoming = {
        id:              row.id,
        part_number:     row.part_number,
        warehouse:       row.warehouse,
        supplier:        row.supplier,
        part_name:       row.part_name,
        total_count:     Number(row.total_count),
        defect_count:    Number(row.defect_count),
        defect_code:     row.defect_code     ?? null,
        defect_code_name:row.defect_code_name ?? null,
        defect_reason:   row.defect_reason   ?? null,
        shift:           row.shift,
        date:            row.date,
        created_by_name: row.created_by_name ?? null,
      }
      const idx = memCache.findIndex(r => r.id === rec.id)
      if (idx >= 0) memCache[idx] = rec
      else memCache.unshift(rec)
    }
  } catch (e) {
    console.warn('incoming_records DB read failed:', (e as Error).message)
  }
  return NextResponse.json(memCache.map(toClient))
}

// ─── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json()
  const {
    partNumber, warehouse, supplier, partName,
    totalCount, defectCount, defectCode, defectCodeName,
    defectReason, shift, date, createdByName,
  } = body

  let id: string
  try {
    const [row] = await sql`
      INSERT INTO incoming_records
        (part_number, warehouse, supplier, part_name,
         total_count, defect_count,
         defect_code, defect_code_name, defect_reason,
         shift, date, created_by_name)
      VALUES
        (${partNumber}, ${warehouse}, ${supplier}, ${partName},
         ${totalCount}, ${defectCount ?? 0},
         ${defectCode ?? null}, ${defectCodeName ?? null},
         ${defectReason ?? null},
         ${shift}, ${date}::date, ${createdByName ?? null})
      RETURNING id
    `
    id = row.id
  } catch {
    id = `mem-${Date.now()}`
  }

  const rec: CachedIncoming = {
    id,
    part_number:      partNumber,
    warehouse,
    supplier,
    part_name:        partName,
    total_count:      Number(totalCount),
    defect_count:     Number(defectCount ?? 0),
    defect_code:      defectCode   ?? null,
    defect_code_name: defectCodeName ?? null,
    defect_reason:    defectReason ?? null,
    shift,
    date,
    created_by_name:  createdByName ?? null,
  }
  memCache.unshift(rec)
  return NextResponse.json(toClient(rec))
}

// ─── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const idx = memCache.findIndex(r => r.id === id)
  if (idx >= 0) memCache.splice(idx, 1)

  if (!id.startsWith('mem-') && !id.startsWith('local-')) {
    try {
      await sql`DELETE FROM incoming_records WHERE id = ${id}::uuid`
    } catch {}
  }
  return NextResponse.json({ ok: true })
}

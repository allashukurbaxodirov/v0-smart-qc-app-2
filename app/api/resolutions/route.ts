import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { tabelNumber?: string; name: string; role: string } }
  catch { return null }
}

// ─── GET: tip bo'yicha resolutionlar ─────────────────────────────────────────
// /api/resolutions?type=ga | welding
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') ?? 'ga'

  try {
    const rows = await sql`
      SELECT record_id, type, status,
             problem_description, root_cause, immediate_action,
             main_action, decision, transfer_target, transfer_reason,
             resolved_at::text, created_by, created_by_name
      FROM resolutions
      WHERE type = ${type}
    `
    // Map format: { [recordId]: Resolution }
    const map: Record<string, any> = {}
    rows.forEach((r: any) => {
      map[r.record_id] = {
        status:             r.status,
        problemDescription: r.problem_description,
        rootCause:          r.root_cause,
        immediateAction:    r.immediate_action,
        mainAction:         r.main_action,
        decision:           r.decision,
        transferTarget:     r.transfer_target,
        transferReason:     r.transfer_reason,
        resolvedAt:         r.resolved_at,
        createdBy:          r.created_by,
        createdByName:      r.created_by_name,
      }
    })
    return NextResponse.json(map)
  } catch (e) {
    console.warn('resolutions GET error:', (e as Error).message)
    return NextResponse.json({})
  }
}

// ─── POST: resolution qo'shish / yangilash ────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 })

  try {
    const body = await req.json()
    const {
      recordId, type,
      status, problemDescription, rootCause, immediateAction,
      mainAction, decision, transferTarget, transferReason,
    } = body

    if (!recordId || !type) {
      return NextResponse.json({ error: 'recordId va type majburiy' }, { status: 400 })
    }

    const id = `${recordId}_${type}`

    try {
      await sql`
        INSERT INTO resolutions (
          id, record_id, type, status,
          problem_description, root_cause, immediate_action, main_action,
          decision, transfer_target, transfer_reason,
          resolved_at, created_by, created_by_name
        ) VALUES (
          ${id}, ${recordId}, ${type}, ${status ?? 'yopilgan'},
          ${problemDescription ?? ''}, ${rootCause ?? ''}, ${immediateAction ?? ''}, ${mainAction ?? ''},
          ${decision ?? 'resolved'}, ${transferTarget ?? ''}, ${transferReason ?? ''},
          NOW(), ${session.tabelNumber ?? '?'}, ${session.name}
        )
        ON CONFLICT (record_id, type) DO UPDATE SET
          status              = EXCLUDED.status,
          problem_description = EXCLUDED.problem_description,
          root_cause          = EXCLUDED.root_cause,
          immediate_action    = EXCLUDED.immediate_action,
          main_action         = EXCLUDED.main_action,
          decision            = EXCLUDED.decision,
          transfer_target     = EXCLUDED.transfer_target,
          transfer_reason     = EXCLUDED.transfer_reason,
          resolved_at         = NOW(),
          created_by          = EXCLUDED.created_by,
          created_by_name     = EXCLUDED.created_by_name
      `
    } catch (dbErr) {
      console.warn('resolutions POST DB error:', (dbErr as Error).message)
    }

    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}

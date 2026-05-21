import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name: string } } catch { return null }
}

// ─── GET: List escalations ─────────────────────────────────────────────────────
// ?role=welding_engineer  → filter by assigned role
// ?batch=UUID             → filter by import batch
// ?status=open            → filter by status
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role   = searchParams.get('role')
  const batch  = searchParams.get('batch')
  const status = searchParams.get('status')

  try {
    const rows = await sql`
      SELECT
        id::text, import_batch::text,
        fault_code, fault_name, shop, prod_team,
        total_count, total_veh_cnt,
        model_damas, model_labo,
        assigned_role, assigned_name,
        priority, status,
        engineer_note, root_cause, action_taken,
        created_at, updated_at, resolved_at
      FROM drr_escalations
      WHERE TRUE
        ${role   ? sql`AND assigned_role = ${role}`        : sql``}
        ${batch  ? sql`AND import_batch  = ${batch}::uuid` : sql``}
        ${status ? sql`AND status        = ${status}`      : sql``}
      ORDER BY
        CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        created_at DESC
      LIMIT 200
    `
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error('drr-escalations GET error:', e.message)
    return NextResponse.json([], { status: 200 })
  }
}

// ─── POST: Create escalation ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      importBatch, faultCode, faultName, shop, prodTeam,
      totalCount, totalVehCnt, modelDamas, modelLabo,
      assignedRole, assignedName, priority, note,
    } = body

    const [row] = importBatch
      ? await sql`
          INSERT INTO drr_escalations
            (import_batch, fault_code, fault_name, shop, prod_team,
             total_count, total_veh_cnt, model_damas, model_labo,
             assigned_role, assigned_name, priority, engineer_note)
          VALUES
            (${importBatch}::uuid,
             ${faultCode}, ${faultName}, ${shop}, ${prodTeam ?? null},
             ${totalCount}, ${totalVehCnt ?? 0},
             ${modelDamas ?? 0}, ${modelLabo ?? 0},
             ${assignedRole ?? 'ga_engineer'}, ${assignedName ?? null},
             ${priority ?? 'high'}, ${note ?? null})
          RETURNING id::text, fault_code, fault_name, status, priority, created_at
        `
      : await sql`
          INSERT INTO drr_escalations
            (fault_code, fault_name, shop, prod_team,
             total_count, total_veh_cnt, model_damas, model_labo,
             assigned_role, assigned_name, priority, engineer_note)
          VALUES
            (${faultCode}, ${faultName}, ${shop}, ${prodTeam ?? null},
             ${totalCount}, ${totalVehCnt ?? 0},
             ${modelDamas ?? 0}, ${modelLabo ?? 0},
             ${assignedRole ?? 'ga_engineer'}, ${assignedName ?? null},
             ${priority ?? 'high'}, ${note ?? null})
          RETURNING id::text, fault_code, fault_name, status, priority, created_at
        `
    return NextResponse.json({ ok: true, escalation: row })
  } catch (e: any) {
    console.error('drr-escalations POST error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── PATCH: Update status / engineer response ──────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { id, status, engineerNote, rootCause, actionTaken } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await sql`
      UPDATE drr_escalations SET
        status        = COALESCE(${status ?? null}, status),
        engineer_note = COALESCE(${engineerNote ?? null}, engineer_note),
        root_cause    = COALESCE(${rootCause   ?? null}, root_cause),
        action_taken  = COALESCE(${actionTaken ?? null}, action_taken),
        resolved_at   = CASE WHEN ${status ?? ''} = 'resolved' THEN NOW() ELSE resolved_at END,
        updated_at    = NOW()
      WHERE id = ${id}::uuid
    `
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('drr-escalations PATCH error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── DELETE: Remove escalation ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    await sql`DELETE FROM drr_escalations WHERE id = ${id}::uuid`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

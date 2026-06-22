import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import sql from '@/lib/db'

async function getSession() {
  const cs = await cookies()
  const raw = cs.get('qc_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) as { role: string; name: string; tabelNumber?: string } } catch { return null }
}

// ─── Shop → engineer role mapping ──────────────────────────────────────────
export const SHOP_ROLE_MAP: Record<string, string> = {
  'WELDING':    'welding_engineer',
  'WELDING-1':  'welding_engineer',
  'WELDING-2':  'welding_engineer',
  'PRESS SHOP': 'press_engineer',
  'PAINT SHOP': 'paint_engineer',
  'GA':         'ga_engineer',
  'SQE':        'sqe_engineer',
  'QE':         'qe_engineer',
  'PE':         'pe_engineer',
}

export const ROLE_LABELS: Record<string, string> = {
  ga_engineer:      'GA Muhandis',
  welding_engineer: 'Welding Muhandis',
  press_engineer:   'Press Shop Muhandis',
  paint_engineer:   'Paint Shop Muhandis',
  sqe_engineer:     'SQE Muhandis',
  qe_engineer:      'QE Muhandis',
  pe_engineer:      'PE Muhandis',
}

// ─── DB jadval yaratish (IF NOT EXISTS) ─────────────────────────────────────
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS escalations (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source        TEXT NOT NULL DEFAULT 'drl',   -- 'drl' | 'drr' | 'gca'
      import_batch  UUID,
      fault_code    TEXT NOT NULL DEFAULT '—',
      fault_name    TEXT NOT NULL,
      shop          TEXT NOT NULL,
      prod_team     TEXT,
      total_count   INT  NOT NULL DEFAULT 0,
      total_weight  NUMERIC DEFAULT 0,             -- GCA uchun
      drl_ratio     NUMERIC,
      model_damas   INT DEFAULT 0,
      model_labo    INT DEFAULT 0,
      assigned_role TEXT NOT NULL DEFAULT 'ga_engineer',
      assigned_name TEXT,
      priority      TEXT NOT NULL DEFAULT 'medium', -- critical|high|medium|low
      status        TEXT NOT NULL DEFAULT 'open',   -- open|in_progress|resolved|cancelled
      engineer_note TEXT,
      root_cause    TEXT,
      action_taken  TEXT,
      transfer_to   TEXT,                           -- uzatilgan rol
      transfer_reason TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at   TIMESTAMPTZ,
      due_date      DATE,
      created_by    TEXT,
      created_by_name TEXT
    )
  `
  // source index
  await sql`CREATE INDEX IF NOT EXISTS idx_escalations_source ON escalations(source)`
  await sql`CREATE INDEX IF NOT EXISTS idx_escalations_role   ON escalations(assigned_role)`
  await sql`CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status)`
  // yangi ustunlar (mavjud jadvalga qo'shish)
  await sql`ALTER TABLE escalations ADD COLUMN IF NOT EXISTS action_image TEXT`
}

// ─── GET ─────────────────────────────────────────────────────────────────────
// ?role=ga_engineer   → engineer uchun
// ?source=drr|gca|drl → manbani filter
// ?status=open        → statusni filter
// ?batch=UUID         → import batch
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp     = new URL(req.url).searchParams
  const role   = sp.get('role')
  const source = sp.get('source')
  const status = sp.get('status')
  const batch  = sp.get('batch')

  try {
    await ensureTable()

    const rows = await sql`
      SELECT
        id::text, source, import_batch::text,
        fault_code, fault_name, shop, prod_team,
        total_count, total_weight, drl_ratio,
        model_damas, model_labo,
        assigned_role, assigned_name,
        priority, status,
        engineer_note, root_cause, action_taken, action_image,
        transfer_to, transfer_reason,
        created_at, updated_at, resolved_at, due_date,
        created_by_name
      FROM escalations
      WHERE TRUE
        ${role   ? sql`AND assigned_role = ${role}`          : sql``}
        ${source ? sql`AND source        = ${source}`        : sql``}
        ${status ? sql`AND status        = ${status}`        : sql``}
        ${batch  ? sql`AND import_batch  = ${batch}::uuid`   : sql``}
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high'     THEN 2
          WHEN 'medium'   THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT 500
    `
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error('escalations GET error:', e.message)
    return NextResponse.json([], { status: 200 })
  }
}

// ─── POST: Eskalatsiya yaratish ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureTable()
    const body = await req.json()

    // Massiv bo'lsa — bir nechta bir vaqtda yaratish (auto-escalation uchun)
    const items: any[] = Array.isArray(body) ? body : [body]

    const created = []
    for (const item of items) {
      const {
        source = 'drl',
        importBatch, faultCode = '—', faultName, shop, prodTeam,
        totalCount = 0, totalWeight = 0, drlRatio, modelDamas = 0, modelLabo = 0,
        assignedRole, priority = 'medium', note, dueDate,
      } = item

      // Shop bo'yicha rol topish
      const role = assignedRole ?? SHOP_ROLE_MAP[shop] ?? 'ga_engineer'

      // Ustunlikni hisoblash
      const prio = priority !== 'medium' ? priority :
        (source === 'gca' && totalWeight >= 100 ? 'critical' :
         source === 'gca' && totalWeight >= 50  ? 'high'     :
         totalCount >= 50                        ? 'critical' :
         totalCount >= 20                        ? 'high'     : 'medium')

      // Xuddi shunday ochiq eskalatsiya bor bo'lsa — skip (duplicate oldini olish)
      const [existing] = await sql`
        SELECT id FROM escalations
        WHERE fault_code = ${faultCode}
          AND shop       = ${shop}
          AND source     = ${source}
          AND status     NOT IN ('resolved', 'cancelled')
        LIMIT 1
      `
      if (existing) {
        // Mavjud eskalatsiyani yangilash (count ko'paygan bo'lishi mumkin)
        await sql`
          UPDATE escalations SET
            total_count  = GREATEST(total_count, ${totalCount}),
            total_weight = GREATEST(total_weight, ${totalWeight}),
            updated_at   = NOW()
          WHERE id = ${existing.id}::uuid
        `
        created.push({ id: existing.id, updated: true })
        continue
      }

      const [row] = importBatch
        ? await sql`
            INSERT INTO escalations
              (source, import_batch, fault_code, fault_name, shop, prod_team,
               total_count, total_weight, drl_ratio, model_damas, model_labo,
               assigned_role, priority, engineer_note, due_date,
               created_by, created_by_name)
            VALUES
              (${source}, ${importBatch}::uuid, ${faultCode}, ${faultName}, ${shop}, ${prodTeam ?? null},
               ${totalCount}, ${totalWeight}, ${drlRatio ?? null}, ${modelDamas}, ${modelLabo},
               ${role}, ${prio}, ${note ?? null}, ${dueDate ?? null},
               ${session.tabelNumber ?? '?'}, ${session.name})
            RETURNING id::text, fault_code, fault_name, status, priority
          `
        : await sql`
            INSERT INTO escalations
              (source, fault_code, fault_name, shop, prod_team,
               total_count, total_weight, drl_ratio, model_damas, model_labo,
               assigned_role, priority, engineer_note, due_date,
               created_by, created_by_name)
            VALUES
              (${source}, ${faultCode}, ${faultName}, ${shop}, ${prodTeam ?? null},
               ${totalCount}, ${totalWeight}, ${drlRatio ?? null}, ${modelDamas}, ${modelLabo},
               ${role}, ${prio}, ${note ?? null}, ${dueDate ?? null},
               ${session.tabelNumber ?? '?'}, ${session.name})
            RETURNING id::text, fault_code, fault_name, status, priority
          `
      created.push(row)
    }

    return NextResponse.json({ ok: true, created })
  } catch (e: any) {
    console.error('escalations POST error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── PATCH: Muhandis javobi / holat yangilash ─────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      id, status, engineerNote, rootCause, actionTaken, actionImage,
      transferTo, transferReason, priority,
    } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const newStatus = transferTo ? 'resolved' : status

    await sql`
      UPDATE escalations SET
        status          = COALESCE(${newStatus   ?? null}, status),
        priority        = COALESCE(${priority    ?? null}, priority),
        engineer_note   = COALESCE(${engineerNote?? null}, engineer_note),
        root_cause      = COALESCE(${rootCause   ?? null}, root_cause),
        action_taken    = COALESCE(${actionTaken ?? null}, action_taken),
        action_image    = COALESCE(${actionImage ?? null}, action_image),
        transfer_to     = COALESCE(${transferTo  ?? null}, transfer_to),
        transfer_reason = COALESCE(${transferReason ?? null}, transfer_reason),
        assigned_name   = COALESCE(${session.name ?? null}, assigned_name),
        resolved_at     = CASE
          WHEN ${newStatus ?? ''} = 'resolved' THEN NOW()
          ELSE resolved_at
        END,
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `

    // Uzatilganda yangi sehga transfer eskalatsiyasi yaratish
    if (transferTo) {
      const [orig] = await sql`
        SELECT fault_code, fault_name, shop, source,
               total_count, total_weight, model_damas, model_labo
        FROM escalations WHERE id = ${id}::uuid
      `
      if (orig) {
        const newRole = SHOP_ROLE_MAP[transferTo] ?? 'ga_engineer'
        await sql`
          INSERT INTO escalations
            (source, fault_code, fault_name, shop, total_count, total_weight,
             model_damas, model_labo, assigned_role, priority, engineer_note,
             created_by, created_by_name)
          VALUES
            (${orig.source}, ${orig.fault_code}, ${orig.fault_name},
             ${transferTo}, ${orig.total_count}, ${orig.total_weight ?? 0},
             ${orig.model_damas ?? 0}, ${orig.model_labo ?? 0},
             ${newRole}, 'high',
             ${`${session.name} tomonidan uzatildi: ${orig.shop} → ${transferTo}. Sabab: ${transferReason ?? '?'}`},
             ${session.tabelNumber ?? '?'}, ${session.name})
        `
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('escalations PATCH error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || !['superadmin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    await sql`DELETE FROM escalations WHERE id = ${id}::uuid`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

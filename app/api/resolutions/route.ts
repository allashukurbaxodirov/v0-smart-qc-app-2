import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { resolutionsCache, Resolution } from '@/lib/resolutions-cache'

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

  const type = (req.nextUrl.searchParams.get('type') ?? 'ga') as 'ga' | 'welding'
  return NextResponse.json(resolutionsCache.asMap(type))
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

    const res: Resolution = {
      id:                 `${recordId}_${type}`,
      recordId,
      type,
      status:             status             ?? 'yopilgan',
      problemDescription: problemDescription ?? '',
      rootCause:          rootCause          ?? '',
      immediateAction:    immediateAction    ?? '',
      mainAction:         mainAction         ?? '',
      decision:           decision           ?? 'resolved',
      transferTarget:     transferTarget     ?? '',
      transferReason:     transferReason     ?? '',
      resolvedAt:         new Date().toISOString(),
      createdBy:          session.tabelNumber ?? '?',
      createdByName:      session.name,
    }

    resolutionsCache.upsert(res)
    return NextResponse.json(res, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Xatolik' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { usersCache } from '@/lib/users-cache'
import { auditLog } from '@/lib/audit-log'

const ROLE_REDIRECTS: Record<string, string> = {
  superadmin:         '/dashboard/superadmin',
  admin:              '/dashboard',
  gca_auditor:        '/dashboard/gca-admin',
  d10_inspector:      '/dashboard/d10-admin',
  d20_inspector:      '/dashboard/d20-admin',
  drr_inspector:      '/dashboard/drr-admin',
  drl_inspector:      '/dashboard/drl-admin',
  pdi_inspector:      '/dashboard/pdi-admin',
  ga_engineer:        '/dashboard/ga-engineer',
  welding_engineer:   '/dashboard/welding-engineer',
  manager:            '/dashboard/manager',
  incoming_inspector: '/dashboard/incoming-admin',
}

export async function POST(request: Request) {
  const body     = await request.json()
  const tabelRaw: string | undefined = body.tabelNumber
  const email:    string | undefined = body.email
  const password: string | undefined = body.password

  if ((!tabelRaw && !email) || !password) {
    return NextResponse.json({ error: 'Tabel raqami va parol kiritilishi shart' }, { status: 400 })
  }

  const tabelNumber = tabelRaw?.toUpperCase().trim()

  // ── 1. DB dan qidiramiz ───────────────────────────────────────────────────
  try {
    let dbUser: any

    if (tabelNumber) {
      ;[dbUser] = await sql`
        SELECT id, tabel_number, email, name, role, shift, shop
        FROM users
        WHERE tabel_number = ${tabelNumber} AND password = ${password}
        LIMIT 1
      `
    } else if (email) {
      ;[dbUser] = await sql`
        SELECT id, tabel_number, email, name, role, shift, shop
        FROM users
        WHERE email = ${email} AND password = ${password}
        LIMIT 1
      `
    }

    if (dbUser) {
      auditLog.add({ actor: dbUser.tabel_number ?? tabelNumber ?? '', actorName: dbUser.name, actorRole: dbUser.role, action: 'LOGIN', ok: true })
      return buildResponse({
        tabelNumber: dbUser.tabel_number ?? tabelNumber ?? '',
        email:       dbUser.email ?? null,
        name:        dbUser.name,
        role:        dbUser.role,
        shift:       dbUser.shift ?? null,
        shop:        dbUser.shop ?? null,
      })
    }
    // DB ulandi lekin foydalanuvchi topilmadi — cache ni ham tekshiramiz
  } catch (err) {
    // DB ulanmadi (ENOTFOUND yoki boshqa xato) — cache ga o'tamiz
    console.warn('Auth DB xato:', (err as Error).message)
  }

  // ── 2. Global cache dan qidiramiz (DB yo'q yoki user topilmadi) ──────────
  const cached = tabelNumber
    ? usersCache.authenticate(tabelNumber, password)
    : (() => {
        const u = usersCache.findByEmail(email ?? '')
        return u?.password === password ? u : undefined
      })()

  if (cached) {
    auditLog.add({ actor: cached.tabelNumber, actorName: cached.name, actorRole: cached.role, action: 'LOGIN', ok: true })
    return buildResponse({
      tabelNumber: cached.tabelNumber,
      email:       cached.email,
      name:        cached.name,
      role:        cached.role,
      shift:       cached.shift ?? null,
      shop:        cached.shop ?? null,
    })
  }

  // ── 3. Hech yerda topilmadi ───────────────────────────────────────────────
  auditLog.add({ actor: tabelNumber ?? email ?? 'unknown', actorName: '?', actorRole: '?', action: 'LOGIN_FAIL', ok: false, details: 'Noto\'g\'ri tabel/parol' })
  return NextResponse.json({ error: "Tabel raqami yoki parol noto'g'ri" }, { status: 401 })
}

function buildResponse(user: { tabelNumber: string; email: string | null; name: string; role: string; shift: string | null; shop: string | null }) {
  const sessionPayload = JSON.stringify({
    tabelNumber: user.tabelNumber,
    email:       user.email ?? '',
    name:        user.name,
    role:        user.role,
    shift:       user.shift ?? null,
    shop:        user.shop ?? null,
  })
  const redirect = ROLE_REDIRECTS[user.role] ?? '/dashboard'
  const response = NextResponse.json({ ok: true, redirect, name: user.name, role: user.role })
  // COOKIE_SECURE=false qo'yilsa lokal HTTP serverda ishlaydi
  // HTTPS serverda (Vercel/nginx+ssl) COOKIE_SECURE=true qiling
  const secureCookie = process.env.COOKIE_SECURE !== 'false'
  response.cookies.set('qc_session', sessionPayload, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 8,
    secure:   secureCookie,
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('qc_session')
  return response
}

import { NextResponse } from 'next/server'

// In production: replace with real DB lookup + bcrypt
const USERS: Record<string, { passwordHash: string; role: string; name: string }> = {
  'demo@uzauto.uz':     { passwordHash: 'demo123',     role: 'admin',          name: 'Demo Admin' },
  'gca@uzauto.uz':      { passwordHash: 'gca123',      role: 'gca_auditor',    name: 'GCA Auditor' },
  'cmm@uzauto.uz':      { passwordHash: 'cmm123',      role: 'cmm_inspector',  name: 'CMM Inspector' },
  'd10@uzauto.uz':      { passwordHash: 'd10123',      role: 'd10_inspector',  name: 'D10 Inspector' },
  'd20@uzauto.uz':      { passwordHash: 'd20123',      role: 'd20_inspector',  name: 'D20 Inspector' },
  'engineer@uzauto.uz': { passwordHash: 'engineer123', role: 'ga_engineer',    name: 'GA Engineer' },
}

const ROLE_REDIRECTS: Record<string, string> = {
  gca_auditor:   '/dashboard/gca-admin',
  cmm_inspector: '/dashboard/cmm-admin',
  d10_inspector: '/dashboard/d10-admin',
  d20_inspector: '/dashboard/d20-admin',
  ga_engineer:   '/dashboard/ga-engineer',
  admin:         '/dashboard',
}

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email va parol kiritilishi shart' }, { status: 400 })
  }

  const user = USERS[email as string]
  if (!user || user.passwordHash !== password) {
    return NextResponse.json({ error: 'Email yoki parol noto\'g\'ri' }, { status: 401 })
  }

  const sessionPayload = JSON.stringify({ email, role: user.role, name: user.name })
  const redirect = ROLE_REDIRECTS[user.role] ?? '/dashboard'

  const response = NextResponse.json({ ok: true, redirect, name: user.name, role: user.role })

  response.cookies.set('qc_session', sessionPayload, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 soat
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('qc_session')
  return response
}

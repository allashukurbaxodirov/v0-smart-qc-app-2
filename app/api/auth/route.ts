import { NextResponse } from 'next/server'
import sql from '@/lib/db'

const ROLE_REDIRECTS: Record<string, string> = {
  gca_auditor:   '/dashboard/gca-admin',
  cmm_inspector: '/dashboard/cmm-admin',
  d10_inspector: '/dashboard/d10-admin',
  d20_inspector: '/dashboard/d20-admin',
  ga_engineer:   '/dashboard/ga-engineer',
  admin:         '/dashboard',
}

// Fallback users (database ulanmasa ishlatiladi)
const FALLBACK_USERS: Record<string, { password: string; name: string; role: string }> = {
  'demo@uzauto.uz':     { password: 'demo123',     name: 'Demo Admin',    role: 'admin' },
  'gca@uzauto.uz':      { password: 'gca123',      name: 'GCA Auditor',   role: 'gca_auditor' },
  'cmm@uzauto.uz':      { password: 'cmm123',      name: 'CMM Inspector', role: 'cmm_inspector' },
  'd10@uzauto.uz':      { password: 'd10123',       name: 'D10 Inspector', role: 'd10_inspector' },
  'd20@uzauto.uz':      { password: 'd20123',       name: 'D20 Inspector', role: 'd20_inspector' },
  'engineer@uzauto.uz': { password: 'engineer123',  name: 'GA Engineer',   role: 'ga_engineer' },
}

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email va parol kiritilishi shart' }, { status: 400 })
  }

  let user: { email: string; name: string; role: string } | null = null

  // Avval database dan tekshiramiz
  try {
    const [dbUser] = await sql`
      SELECT id, email, name, role FROM users
      WHERE email = ${email} AND password = ${password}
      LIMIT 1
    `
    if (dbUser) {
      user = { email: dbUser.email, name: dbUser.name, role: dbUser.role }
    }
  } catch (err) {
    // Database ulanmadi — fallback ga o'tamiz
    console.warn('Database ulanmadi, fallback ishlatilmoqda:', (err as Error).message)
    const fallback = FALLBACK_USERS[email]
    if (fallback && fallback.password === password) {
      user = { email, name: fallback.name, role: fallback.role }
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Email yoki parol noto'g'ri" }, { status: 401 })
  }

  const sessionPayload = JSON.stringify({ email: user.email, role: user.role, name: user.name })
  const redirect = ROLE_REDIRECTS[user.role] ?? '/dashboard'

  const response = NextResponse.json({ ok: true, redirect, name: user.name, role: user.role })

  response.cookies.set('qc_session', sessionPayload, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('qc_session')
  return response
}

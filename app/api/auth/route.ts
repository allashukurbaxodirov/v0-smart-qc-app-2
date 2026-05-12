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

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email va parol kiritilishi shart' }, { status: 400 })
  }

  try {
    const [user] = await sql`
      SELECT id, email, name, role FROM users
      WHERE email = ${email} AND password = ${password}
      LIMIT 1
    `

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
  } catch (err) {
    console.error('Auth error:', err)
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('qc_session')
  return response
}

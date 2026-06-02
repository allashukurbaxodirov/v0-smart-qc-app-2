import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

// Next.js 16 — "proxy" konventsiyasi (middleware emas)
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const raw = request.cookies.get('qc_session')?.value

  // ── /dashboard/* himoyasi ──────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!raw) {
      const url = new URL('/login', request.url)
      url.searchParams.set('from', pathname)
      return NextResponse.redirect(url)
    }
    try {
      const parsed = JSON.parse(raw)
      if (!parsed?.role) throw new Error('no role')
      return NextResponse.next()
    } catch {
      const url = new URL('/login', request.url)
      const res = NextResponse.redirect(url)
      res.cookies.delete('qc_session')
      return res
    }
  }

  // ── /login da session bo'lsa → uy sahifasiga yo'nalt ──────────────────────
  if (pathname === '/login' && raw) {
    try {
      const parsed = JSON.parse(raw)
      const target = parsed?.role
        ? (ROLE_REDIRECTS[parsed.role] ?? '/dashboard')
        : '/dashboard'
      return NextResponse.redirect(new URL(target, request.url))
    } catch {}
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}

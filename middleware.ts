import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Dashboard sahifalari faqat login qilgan foydalanuvchilar uchun
export function middleware(request: NextRequest) {
  const session = request.cookies.get('qc_session')?.value

  // /dashboard/* ni himoya qilamiz
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Session valid ekanligini tekshirish
    try {
      const parsed = JSON.parse(session)
      if (!parsed?.role || !parsed?.tabelNumber) throw new Error('invalid')
    } catch {
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('qc_session')
      return response
    }
  }

  // Login sahifasiga kirsa va session bo'lsa — dashboardga yo'naltir
  if (request.nextUrl.pathname === '/login') {
    if (session) {
      try {
        const parsed = JSON.parse(session)
        if (parsed?.role) {
          const roleRedirects: Record<string, string> = {
            superadmin:         '/dashboard/superadmin',
            admin:              '/dashboard',
            gca_auditor:        '/dashboard/gca-admin',
            cmm_inspector:      '/dashboard/cmm-admin',
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
          const target = roleRedirects[parsed.role] ?? '/dashboard'
          return NextResponse.redirect(new URL(target, request.url))
        }
      } catch {}
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}

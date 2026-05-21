'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Role asosida to'g'ri dashboardga yo'naltirish
const ROLE_REDIRECT: Record<string, string> = {
  superadmin:           '/dashboard/superadmin',
  admin:                '/dashboard/manager',
  manager:              '/dashboard/manager',
  ga_engineer:          '/dashboard/ga-engineer',
  welding_engineer:     '/dashboard/welding-engineer',
  gca_auditor:          '/dashboard/gca',
  cmm_inspector:        '/dashboard/cmm',
  d10_inspector:        '/dashboard/d10',
  d20_inspector:        '/dashboard/d20',
  drr_inspector:        '/dashboard/drr-admin',
  drl_inspector:        '/dashboard/drl-admin',
  pdi_inspector:        '/dashboard/pdi-admin',
  incoming_inspector:   '/dashboard/incoming-admin',
}

export default function DashboardRoot() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(user => {
        const target = ROLE_REDIRECT[user.role] ?? '/dashboard/manager'
        router.replace(target)
      })
      .catch(() => {
        router.replace('/dashboard/manager')
      })
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Yuklanmoqda...</p>
      </div>
    </div>
  )
}

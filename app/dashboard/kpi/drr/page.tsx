'use client'

import PageHeader from '@/components/dashboard/page-header'
import { kpiData } from '@/lib/mock-data'

export default function DRRPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="DRR - Defekt Qayta Ishlash"
        description="Topilgan defektlardan nechtasi tuzatilganligi ko'rsatkichi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar', href: '/dashboard/kpi' },
          { label: 'DRR' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Joriy qiymat</p>
            <p className="text-3xl font-bold text-success">{kpiData.drr.current}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Maqsad</p>
            <p className="text-3xl font-bold text-primary">{kpiData.drr.target}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'tgan qiymat</p>
            <p className="text-3xl font-bold text-muted-foreground">{kpiData.drr.previous}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'zgarish</p>
            <p className="text-3xl font-bold text-success">+1.2%</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tahlil</h2>
          <p className="text-sm text-muted-foreground">
            DRR ko'rsatkichi yaxshi holda joylashgan va ijobiy trendni ko'rsatadi. Topilgan defektlarni tuzatish jarayoni samarali amalga oshirilmoqda.
          </p>
        </div>
      </div>
    </div>
  )
}

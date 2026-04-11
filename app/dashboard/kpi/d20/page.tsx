'use client'

import PageHeader from '@/components/dashboard/page-header'
import { kpiData } from '@/lib/mock-data'

export default function D20Page() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="D20 - Dastlab 20 ta Defekt"
        description="Ishlab chiqarish boshlang'ichida eng ko'p tarqalgan 20 ta defekt"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar', href: '/dashboard/kpi' },
          { label: 'D20' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Joriy qiymat</p>
            <p className="text-3xl font-bold text-critical">{kpiData.d20.current}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Maqsad</p>
            <p className="text-3xl font-bold text-primary">{kpiData.d20.target}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'tgan qiymat</p>
            <p className="text-3xl font-bold text-muted-foreground">{kpiData.d20.previous}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'zgarish</p>
            <p className="text-3xl font-bold text-success">-24</p>
            <p className="text-xs text-muted-foreground mt-1">kamaydi</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tahlil</h2>
          <p className="text-sm text-muted-foreground">
            D20 defektlari ham ijobiy trendni ko'rsatadi. Hali ham maqsaddan yuqori bo'lsa-da, defektlarni kamaytirish bo'yicha ishlash samarali davom etmoqda.
          </p>
        </div>
      </div>
    </div>
  )
}

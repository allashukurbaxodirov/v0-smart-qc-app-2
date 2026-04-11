'use client'

import PageHeader from '@/components/dashboard/page-header'
import { kpiData } from '@/lib/mock-data'

export default function IncomingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Kelayotgan Defektlar"
        description="Yangi taniqlangan va hal qilishni kutayotgan defektlar"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar', href: '/dashboard/kpi' },
          { label: 'Kelayotgan Defektlar' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Joriy qiymat</p>
            <p className="text-3xl font-bold text-warning">{kpiData.incoming.current}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Maqsad</p>
            <p className="text-3xl font-bold text-primary">{kpiData.incoming.target}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'tgan qiymat</p>
            <p className="text-3xl font-bold text-muted-foreground">{kpiData.incoming.previous}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'zgarish</p>
            <p className="text-3xl font-bold text-success">-7</p>
            <p className="text-xs text-muted-foreground mt-1">kamaydi</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tahlil</h2>
          <p className="text-sm text-muted-foreground">
            Kelayotgan defektlar soni kamaymoqda, bu musbat trend. Ammo hali ham 45 ta yangi muammo hal qilishni kutmoqda. Ko'shimcha resurslarga ehtiyoj bo'lishi mumkin.
          </p>
        </div>
      </div>
    </div>
  )
}

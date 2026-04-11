'use client'

import PageHeader from '@/components/dashboard/page-header'
import { kpiData } from '@/lib/mock-data'

export default function DRLPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="DRL - Defekt Qayta Ishlash Xaraji"
        description="Defektlarni qayta ishlash uchun sarflangan vaqt va resurslar xaraji"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar', href: '/dashboard/kpi' },
          { label: 'DRL' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Joriy qiymat</p>
            <p className="text-3xl font-bold text-warning">{kpiData.drl.current}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Maqsad</p>
            <p className="text-3xl font-bold text-primary">{kpiData.drl.target}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'tgan qiymat</p>
            <p className="text-3xl font-bold text-muted-foreground">{kpiData.drl.previous}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'zgarish</p>
            <p className="text-3xl font-bold text-success">-0.5%</p>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <p className="text-sm text-warning font-semibold mb-2">⚠️ Diqqat kerak</p>
          <p className="text-sm text-foreground">
            DRL ko'rsatkichi hali ham maqsad qiymatidan (5.0%) 3.7% yuqori. Defektlarni qayta ishlaydigan jarayonni optimallashtirish kerak.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tavsiyalar</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Defekt tuzatish jarayonini tezlashtirish</li>
            <li>Ishchi treningini ko'payirish</li>
            <li>Qayta ishlash joylarini optimallashtirish</li>
            <li>Defekt oldini olish bo'yicha ishlash</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

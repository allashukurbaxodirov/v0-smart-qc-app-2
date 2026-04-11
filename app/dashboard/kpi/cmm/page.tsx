'use client'

import PageHeader from '@/components/dashboard/page-header'
import { kpiData } from '@/lib/mock-data'

export default function CMMPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="CMM - Ishlab chiqarish Quvvati"
        description="Rejaga nisbatan ishlab chiqarish quvvatining darajasi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar', href: '/dashboard/kpi' },
          { label: 'CMM' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Joriy qiymat</p>
            <p className="text-3xl font-bold text-success">{kpiData.cmm.current}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Maqsad</p>
            <p className="text-3xl font-bold text-primary">{kpiData.cmm.target}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'tgan qiymat</p>
            <p className="text-3xl font-bold text-muted-foreground">{kpiData.cmm.previous}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'zgarish</p>
            <p className="text-3xl font-bold text-success">+0.4%</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tahlil</h2>
          <p className="text-sm text-muted-foreground">
            CMM ko'rsatkichi maqsadga yaqin joylashgan. Ishlab chiqarish quvvati ortiqcha to'g'ri boshqarilmoqda va rejaga muvofiq davom etmoqda.
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import PageHeader from '@/components/dashboard/page-header'
import KPICard from '@/components/dashboard/kpi-card'
import { kpiData } from '@/lib/mock-data'

export default function KPIPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="KPI Ko'rsatkichlar"
        description="Ishlab chiqarish sifati va samaradorlik asosiy ko'rsatkichlari"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6">
        {/* Percentage KPIs */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Foizli ko'rsatkichlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title={kpiData.gca.name}
              value={kpiData.gca.current}
              unit="%"
              change={1.3}
              trend="up"
              status="good"
              href="/dashboard/kpi/gca"
            />
            <KPICard
              title={kpiData.drr.name}
              value={kpiData.drr.current}
              unit="%"
              change={1.2}
              trend="up"
              status="good"
              href="/dashboard/kpi/drr"
            />
            <KPICard
              title={kpiData.ftq.name}
              value={kpiData.ftq.current}
              unit="%"
              change={1.9}
              trend="up"
              status="warning"
              href="/dashboard/kpi/ftq"
            />
            <KPICard
              title={kpiData.cmm.name}
              value={kpiData.cmm.current}
              unit="%"
              change={0.4}
              trend="up"
              status="good"
              href="/dashboard/kpi/cmm"
            />
          </div>
        </div>

        {/* Additional KPIs */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Qo'shimcha ko'rsatkichlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title={kpiData.drl.name}
              value={kpiData.drl.current}
              unit="%"
              change={0.5}
              trend="down"
              status="warning"
              href="/dashboard/kpi/drl"
            />
            <KPICard
              title={kpiData.d10.name}
              value={kpiData.d10.current}
              unit="ta"
              change={12.4}
              trend="down"
              status="warning"
              href="/dashboard/kpi/d10"
              format="number"
            />
            <KPICard
              title={kpiData.d20.name}
              value={kpiData.d20.current}
              unit="ta"
              change={9.0}
              trend="down"
              status="warning"
              href="/dashboard/kpi/d20"
              format="number"
            />
            <KPICard
              title={kpiData.incoming.name}
              value={kpiData.incoming.current}
              unit="ta"
              change={13.5}
              trend="down"
              status="warning"
              href="/dashboard/kpi/incoming"
              format="number"
            />
          </div>
        </div>

        {/* KPI Explanations */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Ko'rsatkichlar bo'yicha izoh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">GCA (Umumiy Konstruksiya Sifati)</h3>
                <p className="text-sm text-muted-foreground">
                  Avtomobil konstruksiyasining umumiy sifatini o'lchaydigan asosiy ko'rsatkich. Yuqori qiymat ishlab chiqarish sifatini ko'rsatadi.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">DRR (Defekt Qayta Ishlash)</h3>
                <p className="text-sm text-muted-foreground">
                  Topilgan defektlardan nechtasi tuzatilganligi. Yuqori qiymat muammoların samarali hal qilinganligini bildiradi.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">FTQ (Birinchi Marta Sifat)</h3>
                <p className="text-sm text-muted-foreground">
                  Birinchi urinishda defektsiz ishlab chiqariladigan avtomobillar foizi. Yuqori qiymat samaradorlikni bildiradi.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">D10 va D20</h3>
                <p className="text-sm text-muted-foreground">
                  Ishlab chiqarish boshlang'ichida eng ko'p tarqalgan defektlar. Pastroq qiymatlar yaxshiroqdir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

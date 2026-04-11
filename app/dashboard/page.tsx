'use client'

import PageHeader from '@/components/dashboard/page-header'
import KPICard from '@/components/dashboard/kpi-card'
import { kpiData, topDefects, shiftPerformance } from '@/lib/mock-data'
import { Bell, AlertTriangle, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardHome() {
  const criticalDefects = topDefects.slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="Bosh sahifa"
        description="UzAuto Motors ishlab chiqarish sifat kontroli - Real-vaqt ko'rsatkichlar"
        actions={
          <Button variant="outline" size="sm" className="gap-2">
            <Bell className="w-4 h-4" />
            Xabarnomalar
          </Button>
        }
      />

      {/* Main Content */}
      <div className="p-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            title={kpiData.drl.name}
            value={kpiData.drl.current}
            unit="%"
            change={0.5}
            trend="down"
            status="warning"
            href="/dashboard/kpi/drl"
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
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title={kpiData.cmm.name}
            value={kpiData.cmm.current}
            unit="%"
            change={0.4}
            trend="up"
            status="good"
            href="/dashboard/kpi/cmm"
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

        {/* Summary Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Defects */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-critical" />
                Eng yuqori defektlar
              </h2>
              <Link href="/dashboard/top-defects">
                <Button variant="ghost" size="sm">
                  Ko&apos;rish →
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {criticalDefects.map((defect) => (
                <div key={defect.id} className="flex items-center justify-between pb-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{defect.name}</p>
                    <p className="text-xs text-muted-foreground">{defect.workshop}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-critical">{defect.count} ta</p>
                    <p className="text-xs text-muted-foreground">{defect.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shift Performance */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Shift samaradorligi
            </h2>
            <div className="space-y-4">
              {shiftPerformance.map((shift) => (
                <div key={shift.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{shift.name}</span>
                    <span className="text-sm font-bold text-success">{shift.efficiency}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-success h-2 rounded-full"
                      style={{ width: `${shift.efficiency}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{shift.output} ta</span>
                    <span>{shift.defects} ta defekt</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/analytics" className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="font-semibold text-sm text-foreground">Analitika</p>
          </Link>
          <Link href="/dashboard/workshops" className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors text-center">
            <div className="text-2xl mb-2">🏭</div>
            <p className="font-semibold text-sm text-foreground">Ishlab chiqarish</p>
          </Link>
          <Link href="/dashboard/reports" className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors text-center">
            <div className="text-2xl mb-2">📋</div>
            <p className="font-semibold text-sm text-foreground">Hisobotlar</p>
          </Link>
          <Link href="/dashboard/settings" className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <p className="font-semibold text-sm text-foreground">Sozlamalar</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

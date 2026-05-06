'use client'

import { useState } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { SmenaDetailModal } from '@/components/dashboard/smena-detail-modal'
import KPICard from '@/components/dashboard/kpi-card'
import { kpiData, topDefects, shiftPerformance, smenaDetails } from '@/lib/mock-data'
import { useGCA } from '@/lib/gca-context'
import { Bell, AlertTriangle, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardHome() {
  const [selectedSmena, setSelectedSmena] = useState<string | null>(null)
  const { getTotalDefects, getDefectsByShop } = useGCA()

  // Calculate dynamic GCA value based on records
  const totalGCADefects = getTotalDefects()
  const dynamicGCAValue = Math.max(85, 100 - (totalGCADefects / 500) * 15) // Dynamic calculation

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'border-success/30 bg-success/5'
      case 'critical':
        return 'border-critical/30 bg-critical/5'
      default:
        return 'border-warning/30 bg-warning/5'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-success text-white'
      case 'critical':
        return 'bg-critical text-white'
      default:
        return 'bg-warning text-white'
    }
  }

  const topDefectsList = topDefects.slice(0, 8)

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
            value={parseFloat(dynamicGCAValue.toFixed(1))}
            unit="%"
            change={dynamicGCAValue > kpiData.gca.current ? dynamicGCAValue - kpiData.gca.current : -(kpiData.gca.current - dynamicGCAValue)}
            trend={dynamicGCAValue > kpiData.gca.current ? 'up' : 'down'}
            status="good"
            href="/dashboard/gca"
          />
          <KPICard
            title={kpiData.drr.name}
            value={kpiData.drr.current}
            unit="%"
            change={1.2}
            trend="up"
            status="good"
            href="/dashboard/drr"
          />
          <KPICard
            title={kpiData.drl.name}
            value={kpiData.drl.current}
            unit="%"
            change={0.5}
            trend="down"
            status="warning"
            href="/dashboard/drl"
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
            href="/dashboard/cmm"
          />
          <KPICard
            title={kpiData.d10.name}
            value={kpiData.d10.current}
            unit="ta"
            change={12.4}
            trend="down"
            status="warning"
            href="/dashboard/d10"
            format="number"
          />
          <KPICard
            title={kpiData.d20.name}
            value={kpiData.d20.current}
            unit="ta"
            change={9.0}
            trend="down"
            status="warning"
            href="/dashboard/d20"
            format="number"
          />
          <KPICard
            title={kpiData.incoming.name}
            value={kpiData.incoming.current}
            unit="ta"
            change={13.5}
            trend="down"
            status="warning"
            href="/dashboard/incoming"
            format="number"
          />
        </div>

        {/* Summary Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Defects - Ranking */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-critical" />
                Eng ko'p uchraydigan nuqsonlar
              </h2>
              <Link href="/dashboard/top-defects">
                <Button variant="ghost" size="sm">
                  Ko&apos;rish →
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {topDefectsList.map((defect, idx) => (
                <div
                  key={defect.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:border-primary ${
                    defect.status === 'critical' ? 'bg-critical/5 border-critical/20' : 'bg-warning/5 border-warning/20'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {defect.code} - {defect.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {defect.workshop} • {defect.shift} smena
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold text-foreground">{defect.count}</p>
                    <p className="text-xs text-muted-foreground">{defect.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smena Performance Cards */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Smenalar samaradorligi
            </h2>
            <div className="space-y-3">
              {shiftPerformance.map((shift) => {
                const smenaName = shift.name
                const statusColor = getStatusColor(shift.status)
                const statusBadge = getStatusBadgeColor(shift.status)

                return (
                  <button
                    key={smenaName}
                    onClick={() => setSelectedSmena(smenaName)}
                    className={`w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg text-left ${statusColor}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-foreground">{smenaName}</h3>
                      <Badge className={statusBadge}>
                        {shift.status === 'good' ? '✓ Yaxshi' : '✕ Muammo'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Jami nuqsonlar</span>
                        <span className="font-bold text-foreground">{shift.defects}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {shift.topDefect}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">Samaradorlik</span>
                        <span className="text-xs font-semibold text-foreground">{shift.efficiency}%</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link href="/dashboard/pdi" className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors text-center">
            <div className="text-2xl mb-2">📝</div>
            <p className="font-semibold text-sm text-foreground">PDI</p>
          </Link>
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

        {/* Smena Detail Modal */}
        {selectedSmena && smenaDetails[selectedSmena as keyof typeof smenaDetails] && (
          <SmenaDetailModal
            smena={selectedSmena}
            data={smenaDetails[selectedSmena as keyof typeof smenaDetails]}
            onClose={() => setSelectedSmena(null)}
          />
        )}
      </div>
    </div>
  )
}

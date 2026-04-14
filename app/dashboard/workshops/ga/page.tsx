'use client'

import { useState } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { gaSectorsDrilldown, gaSectorDetailsDrilldown } from '@/lib/mock-data'
import { ChevronLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function GADrilldownPage() {
  const [activeShift, setActiveShift] = useState('A')
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  const sectors = ['TRIM', 'SHOSSE', 'FINAL', 'SUB'] as const

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'border-success/30 bg-success/5'
      case 'warning':
        return 'border-warning/30 bg-warning/5'
      case 'critical':
        return 'border-critical/30 bg-critical/5'
      default:
        return 'border-border bg-muted/30'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-success text-white'
      case 'warning':
        return 'bg-warning text-white'
      case 'critical':
        return 'bg-critical text-white'
      default:
        return 'bg-muted text-foreground'
    }
  }

  const getProgressBarColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-success'
      case 'yellow':
        return 'bg-warning'
      case 'red':
        return 'bg-critical'
      default:
        return 'bg-muted'
    }
  }

  const getSectorData = (sector: string) => {
    const data = gaSectorsDrilldown[sector as keyof typeof gaSectorsDrilldown]
    return data?.[activeShift as keyof typeof data]?.[0] || null
  }

  const worstSector = sectors.reduce((worst, sector) => {
    const sectorData = getSectorData(sector)
    const worstData = getSectorData(worst)
    return sectorData && worstData && sectorData.defects > worstData.defects ? sector : worst
  })

  const totalDefects = sectors.reduce((sum, sector) => {
    const data = getSectorData(sector)
    return sum + (data?.defects || 0)
  }, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header with Back Button */}
      <PageHeader
        title="GA (Umumiy Montaj)"
        description="Sektorlar bo'yicha nuqson tahlili va reyting"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ishlab chiqarish', href: '/dashboard/workshops' },
          { label: 'GA' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Back Button and Shift Selector */}
        <div className="flex justify-between items-center">
          <Link href="/dashboard/workshops">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              Orqaga
            </Button>
          </Link>
          <div className="inline-flex bg-card border border-border rounded-lg p-1">
            {['A', 'B', 'D'].map((shift) => (
              <button
                key={shift}
                onClick={() => {
                  setActiveShift(shift)
                  setSelectedSector(null)
                }}
                className={`px-4 py-2 rounded-md font-semibold transition-all ${
                  activeShift === shift
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {shift} smena
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Jami nuqsonlar</p>
            <p className="text-3xl font-bold text-foreground">{totalDefects}</p>
            <p className="text-xs text-muted-foreground mt-1">{activeShift} smena</p>
          </div>

          <div className="bg-card border border-warning/30 bg-warning/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              <p className="text-xs font-semibold text-muted-foreground">Eng yomon sektor</p>
            </div>
            <p className="text-lg font-bold text-foreground">{worstSector}</p>
            <p className="text-xs text-muted-foreground mt-1">{getSectorData(worstSector)?.defects} nuqson</p>
          </div>

          <div className="bg-card border border-success/30 bg-success/5 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">O'rtacha sifat</p>
            <p className="text-2xl font-bold text-success">A-</p>
            <p className="text-xs text-muted-foreground mt-1">Barcha sektorlar</p>
          </div>
        </div>

        {/* Sector Cards Grid */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Sektorlar nuqsonlari ({activeShift} smena)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectors.map((sector) => {
              const data = getSectorData(sector)
              if (!data) return null

              const statusColor = getStatusColor(data.status)
              const statusBadge = getStatusBadge(data.status)
              const progressColor = getProgressBarColor(data.color)
              const isWorst = sector === worstSector

              return (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(sector)}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg text-left ${statusColor} ${
                    isWorst ? 'ring-2 ring-warning' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{sector}</h3>
                      <p className="text-xs text-muted-foreground">{data.shift} smena</p>
                    </div>
                    {isWorst && (
                      <Badge variant="destructive" className="text-xs">
                        Eng yomon
                      </Badge>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">Nuqsonlar soni</span>
                      <span className="text-2xl font-bold text-foreground">{data.defects}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${progressColor}`}
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{data.percentage}%</p>
                  </div>

                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    Batafsil →
                  </Button>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sector Detail Modal */}
        {selectedSector && gaSectorDetailsDrilldown[selectedSector as keyof typeof gaSectorDetailsDrilldown] && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">{selectedSector}</h2>
                  <button
                    onClick={() => setSelectedSector(null)}
                    className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{activeShift} smena</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Top Defects */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">Eng ko'p uchraydigan nuqsonlar</h3>
                  <div className="space-y-2">
                    {gaSectorDetailsDrilldown[selectedSector as keyof typeof gaSectorDetailsDrilldown]?.topDefects.map(
                      (defect, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-foreground">
                                {defect.code} - {defect.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{defect.workshop}</p>
                            </div>
                            <span className="font-bold text-foreground ml-2">{defect.count} ta</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Root Causes */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">Muammo sabablari</h3>
                  <ul className="space-y-2">
                    {gaSectorDetailsDrilldown[selectedSector as keyof typeof gaSectorDetailsDrilldown]?.rootCauses.map(
                      (cause, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="text-primary font-bold flex-shrink-0">•</span>
                          <span className="text-sm text-foreground">{cause}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>

                {/* Recommended Actions */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">Chora-tadbirlar</h3>
                  <div className="space-y-2">
                    {gaSectorDetailsDrilldown[selectedSector as keyof typeof gaSectorDetailsDrilldown]?.actions.map(
                      (action, idx) => (
                        <div key={idx} className="flex gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <span className="text-primary font-bold flex-shrink-0">{idx + 1}</span>
                          <span className="text-sm text-foreground">{action}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedSector(null)}>
                  Yopish
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

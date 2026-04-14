'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/dashboard/page-header'
import { weldingSectors, weldingSectorDetails } from '@/lib/mock-data'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function WeldingDrilldownPage() {
  const params = useParams()
  const shop = (params.shop as string).toUpperCase().replace('-', ' ')
  const [activeShift, setActiveShift] = useState('A')
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  const shopData = weldingSectors[shop as keyof typeof weldingSectors]
  const shiftData = shopData?.[activeShift as keyof typeof shopData] || []
  const sectorDetails = selectedSector ? weldingSectorDetails[selectedSector as keyof typeof weldingSectorDetails] : null

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

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header with Back Button */}
      <PageHeader
        title={shop}
        description="Sektoral nuqson tahlili va reyting"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ishlab chiqarish', href: '/dashboard/workshops' },
          { label: shop },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Shift Selector */}
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

        {/* Sectors Grid */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Sektorlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {shiftData.map((sector) => (
              <button
                key={sector.name}
                onClick={() => setSelectedSector(sector.name)}
                className={`p-5 rounded-xl border-2 transition-all hover:shadow-lg hover:border-primary text-left ${getStatusColor(
                  sector.status
                )}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">{sector.name}</h3>
                  <Badge className={getStatusBadge(sector.status)}>
                    {sector.status === 'good'
                      ? '✓'
                      : sector.status === 'warning'
                        ? '⚠'
                        : '✕'}
                  </Badge>
                </div>

                {/* Main Metric */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Nuqsonlar soni</p>
                  <p className="text-3xl font-bold text-foreground">{sector.defects}</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressBarColor(sector.color)}`}
                      style={{ width: `${sector.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Percentage and Shift */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{sector.percentage.toFixed(1)}%</span>
                  <span className="text-xs text-muted-foreground">{sector.shift} smena</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sector Details Modal/Section */}
        {selectedSector && sectorDetails && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">{selectedSector}</h2>
                <button
                  onClick={() => setSelectedSector(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Top Defects */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">Top nuqsonlar</h3>
                  <div className="space-y-3">
                    {sectorDetails.topDefects.map((defect, idx) => (
                      <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">
                              {defect.code} - {defect.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{defect.workshop}</p>
                          </div>
                          <span className="text-lg font-bold text-foreground">{defect.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Root Causes */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">Muammo sabablari</h3>
                  <div className="space-y-2">
                    {sectorDetails.rootCauses.map((cause, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        <span className="text-primary font-bold flex-shrink-0">•</span>
                        <p className="text-sm text-foreground">{cause}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Actions */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4">Chora-tadbirlar</h3>
                  <div className="space-y-2">
                    {sectorDetails.actions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                        <span className="text-success font-bold flex-shrink-0">✓</span>
                        <p className="text-sm text-foreground">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedSector(null)}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { SectorDetailModal } from '@/components/dashboard/sector-detail-modal'
import {
  productionWorkshops,
  productionWorkshopsShiftB,
  productionWorkshopsShiftD,
  gaSectors,
  topDefectsList,
  shiftRankings,
  productionAnalyticsChart,
  defectTrendData,
  shiftComparisonData,
  sectorDetails,
  worstSectorsByShift,
} from '@/lib/mock-data'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

const COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)']

export default function ProductionPage() {
  const [activeShift, setActiveShift] = useState('A')
  const [expandedGa, setExpandedGa] = useState(false)
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  const workshopsData = activeShift === 'A' ? productionWorkshops : activeShift === 'B' ? productionWorkshopsShiftB : productionWorkshopsShiftD
  const gaData = gaSectors[activeShift as keyof typeof gaSectors]
  const shiftRank = shiftRankings[activeShift as keyof typeof shiftRankings]

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="Ishlab chiqarish"
        description="Sexlar va sektorlar bo'yicha nuqson tahlili va reyting"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ishlab chiqarish' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Shift Switcher */}
        <div className="flex justify-end gap-2 mb-4">
          <div className="inline-flex bg-card border border-border rounded-lg p-1">
            {['A', 'B', 'D'].map((shift) => (
              <button
                key={shift}
                onClick={() => {
                  setActiveShift(shift)
                  setExpandedGa(false)
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

        {/* Workshop Cards Grid */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Sexlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {workshopsData.map((workshop) => {
              const statusColor =
                workshop.status === 'good'
                  ? 'border-success bg-success/5'
                  : workshop.status === 'warning'
                    ? 'border-warning bg-warning/5'
                    : 'border-critical bg-critical/5'

              // Check if this is a welding shop for drill-down
              const isWeldingShop = workshop.id === 'weld1' || workshop.id === 'weld2'
              const weldingLink = workshop.id === 'weld1' ? '/dashboard/workshops/welding/welding-1' : '/dashboard/workshops/welding/welding-2'

              const cardContent = (
                <div className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                  expandedGa && workshop.id === 'ga' ? 'ring-2 ring-primary' : statusColor
                }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-foreground text-sm">{workshop.name}</h3>
                    {workshop.id === 'ga' && expandedGa && (
                      <ChevronRight className="w-4 h-4 text-primary transform rotate-90" />
                    )}
                    {isWeldingShop && (
                      <ChevronRight className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Jami nuqsonlar</p>
                      <p className="text-2xl font-bold text-foreground">{workshop.defects}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Holat</p>
                      <Badge
                        variant={
                          workshop.status === 'good' ? 'secondary' : workshop.status === 'warning' ? 'default' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {workshop.status === 'good' ? '✓ Yaxshi' : workshop.status === 'warning' ? '⚠ Diqqat' : '✕ Yomon'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {workshop.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-critical" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-success" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {workshop.trend === 'up' ? '+' : '-'}
                        {Math.abs(workshop.defects - workshop.prevDefects)} vs oldingi
                      </span>
                    </div>
                  </div>
                </div>
              )

              return (
                <div
                  key={workshop.id}
                  onClick={() => {
                    if (workshop.id === 'ga') {
                      setExpandedGa(!expandedGa)
                    }
                  }}
                >
                  {isWeldingShop ? (
                    <Link href={weldingLink}>
                      {cardContent}
                    </Link>
                  ) : (
                    cardContent
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* GA Drill-down */}
        {expandedGa && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-xl font-bold text-foreground">GA - Sektorlar</h2>
              <span className="text-sm text-muted-foreground">({activeShift} smena)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {gaData.map((sector) => {
                const statusColor =
                  sector.status === 'good' ? 'border-success bg-success/5' : 'border-warning bg-warning/5'

                return (
                  <div key={sector.name} className={`border rounded-lg p-4 ${statusColor}`}>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sektor nomi</p>
                        <p className="font-bold text-foreground text-sm">{sector.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Jami nuqsonlar</p>
                        <p className="text-2xl font-bold text-foreground">{sector.defects}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Reyting</p>
                          <Badge variant="outline" className="text-xs font-bold">
                            {sector.rating}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-1">Trend</p>
                          <div className="flex items-center justify-end">
                            {sector.trend === 'up' ? (
                              <TrendingUp className="w-4 h-4 text-critical" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-success" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Production Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Eng ko'p nuqson sex</p>
            <p className="text-lg font-bold text-foreground">
              {workshopsData.reduce((max, w) => (w.defects > max.defects ? w : max)).name}
            </p>
            <p className="text-sm text-critical font-semibold mt-1">
              {workshopsData.reduce((max, w) => (w.defects > max.defects ? w : max)).defects} ta
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Eng kam nuqson sex</p>
            <p className="text-lg font-bold text-foreground">
              {workshopsData.reduce((min, w) => (w.defects < min.defects ? w : min)).name}
            </p>
            <p className="text-sm text-success font-semibold mt-1">
              {workshopsData.reduce((min, w) => (w.defects < min.defects ? w : min)).defects} ta
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Jami nuqsonlar ({activeShift} smena)</p>
            <p className="text-lg font-bold text-foreground">{workshopsData.reduce((sum, w) => sum + w.defects, 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Barcha sexlar</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Smena reytingi</p>
            <div className="flex items-end gap-2">
              <p className="text-lg font-bold text-foreground">{shiftRank.rank}</p>
              <Badge variant={shiftRank.status === 'good' ? 'secondary' : 'default'} className="mb-0.5">
                {shiftRank.status === 'good' ? 'Yaxshi' : 'Diqqat'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Defect Distribution Pie Chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-6">Nuqson taqsimoti (sex bo'yicha)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workshopsData}
                  dataKey="defects"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {workshopsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Defect Count Bar Chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-6">Nuqson soni (sex bo'yicha)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workshopsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Bar dataKey="defects" fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend and Comparison Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Defect Trend Over Time */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-6">Nuqson trendi (haftalik)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={defectTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="press" stroke="var(--color-chart-1)" name="PRESS SHOP" />
                <Line type="monotone" dataKey="weld1" stroke="var(--color-chart-2)" name="WELDING 1" />
                <Line type="monotone" dataKey="weld2" stroke="var(--color-chart-3)" name="WELDING 2" />
                <Line type="monotone" dataKey="paint" stroke="var(--color-chart-4)" name="PAINT SHOP" />
                <Line type="monotone" dataKey="ga" stroke="var(--color-chart-5)" name="GA" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Shift Comparison */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-6">Smenalar taqqoslash (nuqson soni)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={shiftComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="workshop" stroke="var(--color-muted-foreground)" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <Legend />
                <Bar dataKey="A" fill="var(--color-chart-1)" name="A smena" />
                <Bar dataKey="B" fill="var(--color-chart-2)" name="B smena" />
                <Bar dataKey="D" fill="var(--color-chart-3)" name="D smena" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranking Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Reyting va tahlil</h2>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Shift Rankings */}
            <div>
              <h3 className="font-bold text-foreground mb-4 text-sm">Smenalar reytingi</h3>
              <div className="space-y-3">
                {[
                  { shift: 'B', defects: shiftRankings.B.defects, rank: 1, status: 'good' },
                  { shift: 'A', defects: shiftRankings.A.defects, rank: 2, status: 'good' },
                  { shift: 'D', defects: shiftRankings.D.defects, rank: 3, status: 'warning' },
                ].map((item) => (
                  <div
                    key={item.shift}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-semibold text-sm text-foreground">{item.shift} smena</p>
                      <p className="text-xs text-muted-foreground">{item.defects} nuqson</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">#{item.rank}</p>
                      <Badge variant={item.status === 'good' ? 'secondary' : 'default'} className="text-xs mt-1">
                        {item.status === 'good' ? 'Yaxshi' : 'Diqqat'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 10 Defects */}
            <div className="lg:col-span-2">
              <h3 className="font-bold text-foreground mb-4 text-sm">Top 10 nuqson</h3>
              <div className="space-y-2">
                {topDefectsList.map((defect, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border hover:border-primary transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">
                          {defect.code} - {defect.name}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-muted text-foreground text-xs font-medium">
                            {defect.workshop}
                          </span>
                          <span>{defect.shift} smena</span>
                        </div>
                      </div>
                      <span className="font-bold text-foreground ml-2">{defect.count} ta</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst Sectors with Shift Info - Interactive */}
            <div>
              <h3 className="font-bold text-foreground mb-4 text-sm">Eng yomon sektorlar reytingi</h3>
              <div className="space-y-2">
                {worstSectorsByShift[activeShift as keyof typeof worstSectorsByShift]
                  .sort((a, b) => b.defects - a.defects)
                  .map((sector) => (
                    <button
                      key={sector.sector}
                      onClick={() => setSelectedSector(sector.sector)}
                      className="w-full p-3 bg-muted/30 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{sector.sector} - {sector.shift} smena</p>
                          <p className="text-xs text-muted-foreground mt-1">{sector.defects} nuqson</p>
                        </div>
                        <Badge variant={sector.rating === 'A+' || sector.rating === 'A' ? 'secondary' : 'default'} className="text-xs">
                          {sector.rating}
                        </Badge>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Most Problematic Workshops Ranking */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold text-foreground mb-4">Eng ko'p nuqson paydo bo'layotgan sexlar</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">O'rni</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Sex nomi</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Nuqsonlar</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Trend</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Holat</th>
                </tr>
              </thead>
              <tbody>
                {workshopsData
                  .sort((a, b) => b.defects - a.defects)
                  .map((workshop, idx) => (
                    <tr key={workshop.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-xs">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">{workshop.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-foreground">{workshop.defects}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {workshop.trend === 'up' ? (
                            <span className="flex items-center gap-1 text-critical">
                              <TrendingUp className="w-4 h-4" />
                              +{workshop.defects - workshop.prevDefects}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-success">
                              <TrendingDown className="w-4 h-4" />
                              -{workshop.prevDefects - workshop.defects}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-center font-semibold`}>
                        <Badge
                          variant={
                            workshop.status === 'good'
                              ? 'secondary'
                              : workshop.status === 'warning'
                                ? 'default'
                                : 'destructive'
                          }
                        >
                          {workshop.status === 'good'
                            ? '✓ Yaxshi'
                            : workshop.status === 'warning'
                              ? '⚠ Diqqat'
                              : '✕ Yomon'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sector Detail Modal */}
        {selectedSector && (
          <SectorDetailModal
            sector={selectedSector}
            shift={activeShift}
            onClose={() => setSelectedSector(null)}
            sectorData={sectorDetails[selectedSector as keyof typeof sectorDetails]}
          />
        )}
      </div>
    </div>
  )
}

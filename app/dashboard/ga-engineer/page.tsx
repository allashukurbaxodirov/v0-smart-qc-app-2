'use client'

import { useState } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { gaMockIssues, gaEngineerSectors, gaIssueStatuses, gaRootCauseOptions, gaActionOptions, gaTransferTargets } from '@/lib/mock-data'
import { ChevronLeft, ChevronRight, Trash2, Check, AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function GAEngineerPage() {
  const [selectedIssue, setSelectedIssue] = useState<typeof gaMockIssues[0] | null>(null)
  const [filterShift, setFilterShift] = useState<string>('')
  const [filterSector, setFilterSector] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'factor'>('date')

  // Filter issues
  const filteredIssues = gaMockIssues.filter((issue) => {
    if (filterShift && issue.shift !== filterShift) return false
    if (filterSector && issue.sector !== filterSector) return false
    if (filterStatus && issue.status !== filterStatus) return false
    return true
  })

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
    return b.factor - a.factor
  })

  // Calculate KPIs
  const openIssues = gaMockIssues.filter((i) => i.status === 'ochiq').length
  const inProgressIssues = gaMockIssues.filter((i) => i.status === 'jarayonda').length
  const transferredIssues = gaMockIssues.filter((i) => i.status === 'uzatilgan').length
  const closedIssues = gaMockIssues.filter((i) => i.status === 'yopilgan').length
  const overdueIssues = gaMockIssues.filter((i) => i.status === 'kechikkan').length
  const totalIssues = gaMockIssues.length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ochiq':
        return { bg: 'bg-critical/10', badge: 'bg-critical text-white', label: 'Ochiq' }
      case 'jarayonda':
        return { bg: 'bg-warning/10', badge: 'bg-warning text-white', label: 'Jarayonda' }
      case 'uzatilgan':
        return { bg: 'bg-info/10', badge: 'bg-info text-white', label: 'Uzatilgan' }
      case 'yopilgan':
        return { bg: 'bg-success/10', badge: 'bg-success text-white', label: 'Yopilgan' }
      case 'kechikkan':
        return { bg: 'bg-secondary/10', badge: 'bg-secondary text-white', label: 'Kechikkan' }
      default:
        return { bg: 'bg-muted/10', badge: 'bg-muted text-white', label: 'Noma\'lum' }
    }
  }

  const getRiskColor = (factor: number) => {
    if (factor >= 20) return 'bg-critical text-white'
    if (factor >= 15) return 'bg-warning text-white'
    return 'bg-success text-white'
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="GA Engineer paneli"
        description="GA nuqsonlarini tahlil qilish, muammoni hal qilish va IRAS jarayonini boshqarish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'GA Engineer paneli' },
        ]}
      />

      <main className="px-6 py-8 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Ochiq muammolar</p>
            <p className="text-2xl font-bold text-critical">{openIssues}</p>
            <p className="text-xs text-muted-foreground mt-2">Umumiy: {totalIssues}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Jarayonda</p>
            <p className="text-2xl font-bold text-warning">{inProgressIssues}</p>
            <p className="text-xs text-muted-foreground mt-2">Ishlayotgan</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Uzatilgan</p>
            <p className="text-2xl font-bold text-info">{transferredIssues}</p>
            <p className="text-xs text-muted-foreground mt-2">Boshqa sexga</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Yopilgan</p>
            <p className="text-2xl font-bold text-success">{closedIssues}</p>
            <p className="text-xs text-muted-foreground mt-2">Hal qilingan</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Kechikkan</p>
            <p className="text-2xl font-bold text-secondary">{overdueIssues}</p>
            <p className="text-xs text-muted-foreground mt-2">Ehtiyot</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Eng yuqori</p>
            <p className="text-2xl font-bold text-foreground">25</p>
            <p className="text-xs text-muted-foreground mt-2">Faktor</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issues Table */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header with Filters */}
              <div className="p-6 border-b border-border space-y-4">
                <h2 className="text-lg font-bold text-foreground">Kiritilgan GA nuqsonlari</h2>

                {/* Filters */}
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={filterShift}
                    onChange={(e) => setFilterShift(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">Barcha smenalar</option>
                    <option value="A">A smena</option>
                    <option value="B">B smena</option>
                    <option value="D">D smena</option>
                  </select>

                  <select
                    value={filterSector}
                    onChange={(e) => setFilterSector(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">Barcha sektorlar</option>
                    {gaEngineerSectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">Barcha holatlar</option>
                    {gaIssueStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="date">Sana bo'yicha</option>
                    <option value="factor">Faktor bo'yicha</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Smena</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sektor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson kodi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson nomi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Soni</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Faktor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedIssues.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          Hali ma'lumot yo'q
                        </td>
                      </tr>
                    ) : (
                      sortedIssues.map((issue) => {
                        const statusColor = getStatusColor(issue.status)
                        return (
                          <tr
                            key={issue.id}
                            onClick={() => setSelectedIssue(issue)}
                            className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 text-sm text-foreground">{issue.date}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{issue.shift}</td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground">{issue.sector}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">{issue.code}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{issue.name}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{issue.count}</td>
                            <td className="px-4 py-3 text-sm font-semibold">
                              <Badge className={getRiskColor(issue.factor)}>{issue.factor}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className={statusColor.badge}>{statusColor.label}</Badge>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Issue Detail Panel */}
          <div className="lg:col-span-1">
            {selectedIssue ? (
              <div className="bg-card border border-border rounded-xl p-6 space-y-6 sticky top-20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Muammo tafsiloti</h3>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Issue Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Nuqson kodi</p>
                    <p className="text-sm font-semibold text-foreground">{selectedIssue.code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nuqson nomi</p>
                    <p className="text-sm font-semibold text-foreground">{selectedIssue.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Sektor</p>
                      <p className="text-sm font-semibold text-foreground">{selectedIssue.sector}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Smena</p>
                      <p className="text-sm font-semibold text-foreground">{selectedIssue.shift}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Soni</p>
                      <p className="text-sm font-semibold text-foreground">{selectedIssue.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Faktor</p>
                      <p className="text-sm font-semibold">
                        <Badge className={getRiskColor(selectedIssue.factor)}>{selectedIssue.factor}</Badge>
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kiritgan shaxs</p>
                    <p className="text-sm font-semibold text-foreground">{selectedIssue.submittedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Holat</p>
                    <p className="text-sm font-semibold">
                      <Badge className={getStatusColor(selectedIssue.status).badge}>
                        {getStatusColor(selectedIssue.status).label}
                      </Badge>
                    </p>
                  </div>
                </div>

                {/* Engineer Note */}
                {selectedIssue.engineerNote && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Engineer izohi</p>
                    <p className="text-sm text-foreground bg-muted/50 rounded p-2">{selectedIssue.engineerNote}</p>
                  </div>
                )}

                {/* Root Cause */}
                {selectedIssue.rootCause && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Muammo kelib chiqish sababi</p>
                    <p className="text-sm text-foreground bg-muted/50 rounded p-2">{selectedIssue.rootCause}</p>
                  </div>
                )}

                {/* Action */}
                {selectedIssue.action && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Chora-tadbir</p>
                    <p className="text-sm text-foreground bg-muted/50 rounded p-2">{selectedIssue.action}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t border-border pt-4 space-y-2">
                  <Button className="w-full text-sm" variant="default">
                    Izoh qo'shish
                  </Button>
                  <Button className="w-full text-sm" variant="outline">
                    Sabab belgilash
                  </Button>
                  <Button className="w-full text-sm" variant="outline">
                    Chora-tadbir belgilash
                  </Button>
                  <Button className="w-full text-sm" variant="outline">
                    Boshqa sexga uzatish
                  </Button>
                  <Button className="w-full text-sm" variant="outline">
                    Holatni yangilash
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center h-96">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  Muammoni ochish uchun ro'yxatdan qatorni tanlab oling
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { gaMockIssues, drrIssuesForGAEngineer, drlIssuesForGAEngineer, gaEngineerSectors, gaIssueStatuses, gaRootCauseOptions, gaActionOptions, gaTransferTargets, topDefects } from '@/lib/mock-data'
import { ChevronLeft, ChevronRight, Trash2, Check, AlertTriangle, Clock, ArrowRight, TrendingUp, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import Link from 'next/link'

export default function GAEngineerPage() {
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'open' | 'top10'>('dashboard')
  const [filterShift, setFilterShift] = useState<string>('')
  const [filterSector, setFilterSector] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterModule, setFilterModule] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'factor'>('date')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferNote, setTransferNote] = useState('')

  // Combine all issues from GA, DRR, DRL
  const allIssues = useMemo(() => {
    return [
      ...gaMockIssues.map(i => ({ ...i, module: 'GA' })),
      ...drrIssuesForGAEngineer.map(i => ({ ...i, module: 'DRR' })),
      ...drlIssuesForGAEngineer.map(i => ({ ...i, module: 'DRL' })),
    ]
  }, [])

  // Filter issues
  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (filterShift && issue.shift !== filterShift) return false
      if (filterSector && issue.sector !== filterSector) return false
      if (filterStatus && issue.status !== filterStatus) return false
      if (filterModule && issue.module !== filterModule) return false
      return true
    })
  }, [filterShift, filterSector, filterStatus, filterModule])

  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
      return b.factor - a.factor
    })
  }, [filteredIssues, sortBy])

  // Calculate KPIs across all modules
  const openIssues = allIssues.filter((i) => i.status === 'ochiq').length
  const drrIssues = allIssues.filter((i) => i.module === 'DRR' && i.gaRelated).length
  const drlIssues = allIssues.filter((i) => i.module === 'DRL' && i.gaRelated).length
  const inProgressIssues = allIssues.filter((i) => i.status === 'jarayonda').length
  const sentToManagerIssues = allIssues.filter((i) => i.status === 'sent_to_manager').length
  const closedIssues = allIssues.filter((i) => i.status === 'yopilgan').length
  const maxFactorIssue = allIssues.reduce((max, i) => i.factor > (max.factor || 0) ? i : max, { factor: 0 })

  // Sector distribution
  const sectorData = useMemo(() => {
    const sectors = ['TRIM', 'SHOSSE', 'FINAL', 'SUB']
    return sectors.map(sector => ({
      name: sector,
      soni: allIssues.filter(i => i.sector === sector).length,
      faktor: allIssues.filter(i => i.sector === sector).reduce((sum, i) => sum + i.factor, 0)
    }))
  }, [])

  // Shift distribution
  const shiftData = useMemo(() => {
    const shifts = ['A', 'B', 'D']
    return shifts.map(shift => ({
      name: `${shift} smena`,
      soni: allIssues.filter(i => i.shift === shift).length,
    }))
  }, [])

  // Top 10 defects from combined data
  const top10Defects = useMemo(() => {
    const defectMap = new Map()
    allIssues.forEach(issue => {
      const key = `${issue.code}-${issue.name}`
      if (defectMap.has(key)) {
        defectMap.get(key).count += issue.count
        defectMap.get(key).factor = Math.max(defectMap.get(key).factor, issue.factor)
      } else {
        defectMap.set(key, {
          code: issue.code,
          name: issue.name,
          count: issue.count,
          factor: issue.factor,
          modules: [issue.module],
        })
      }
    })
    
    return Array.from(defectMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ochiq':
        return { bg: 'bg-critical/10', badge: 'bg-critical text-white', label: 'Ochiq' }
      case 'jarayonda':
        return { bg: 'bg-warning/10', badge: 'bg-warning text-white', label: 'Jarayonda' }
      case 'uzatilgan':
        return { bg: 'bg-info/10', badge: 'bg-info text-white', label: 'Uzatilgan' }
      case 'sent_to_manager':
        return { bg: 'bg-primary/10', badge: 'bg-primary text-white', label: 'Managerga yuborildi' }
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

  const getModuleColor = (module: string) => {
    switch(module) {
      case 'GA': return 'bg-primary text-white'
      case 'DRR': return 'bg-warning text-white'
      case 'DRL': return 'bg-info text-white'
      default: return 'bg-muted text-white'
    }
  }

  const handleTransferToManager = () => {
    setShowTransferModal(false)
    setTransferNote('')
    setSelectedIssue(null)
  }

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

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

      <main className="px-6 py-8 max-w-7xl mx-auto space-y-8">
        {/* Engineer Work Desk KPI Cards */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Engineer ish stoli</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            <button
              onClick={() => setActiveTab('open')}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer text-left"
            >
              <p className="text-xs text-muted-foreground mb-1">Ochiq muammolar</p>
              <p className="text-2xl font-bold text-critical">{openIssues}</p>
              <p className="text-xs text-muted-foreground mt-2">Batafsil ko'rish</p>
            </button>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">DRR dan kelgan</p>
              <p className="text-2xl font-bold text-warning">{drrIssues}</p>
              <p className="text-xs text-muted-foreground mt-2">GA bog'liq</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">DRL dan kelgan</p>
              <p className="text-2xl font-bold text-info">{drlIssues}</p>
              <p className="text-xs text-muted-foreground mt-2">GA bog'liq</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Jarayonda</p>
              <p className="text-2xl font-bold text-warning">{inProgressIssues}</p>
              <p className="text-xs text-muted-foreground mt-2">Ishlayotgan</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Managerga yuborilgan</p>
              <p className="text-2xl font-bold text-primary">{sentToManagerIssues}</p>
              <p className="text-xs text-muted-foreground mt-2">Tasdiqlashda</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Yopilgan</p>
              <p className="text-2xl font-bold text-success">{closedIssues}</p>
              <p className="text-xs text-muted-foreground mt-2">Hal qilingan</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Eng yuqori faktor</p>
              <p className="text-2xl font-bold text-critical">{maxFactorIssue.factor}</p>
              <p className="text-xs text-muted-foreground mt-2">Xavflilik</p>
            </div>
          </div>
        </div>

        {/* Dashboard Tab View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top 10 Defects Bar Chart */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
                <h3 className="text-base font-bold text-foreground mb-4">Top 10 nuqsonlar</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={top10Defects.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="code" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                    <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sector Distribution Pie Chart */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-base font-bold text-foreground mb-4">Sektor bo'yicha</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={sectorData} dataKey="soni" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Shift Performance */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Smena bo'yicha muammolar</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={shiftData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="soni" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Open Issues Tab */}
        {activeTab === 'open' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Issues Table */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">Ochiq muammolar</h2>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={filterModule}
                      onChange={(e) => setFilterModule(e.target.value)}
                      className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    >
                      <option value="">Barcha modullar</option>
                      <option value="GA">GA</option>
                      <option value="DRR">DRR</option>
                      <option value="DRL">DRL</option>
                    </select>
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
                      <option value="ochiq">Ochiq</option>
                      <option value="jarayonda">Jarayonda</option>
                      <option value="uzatilgan">Uzatilgan</option>
                      <option value="yopilgan">Yopilgan</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Modul</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Kod</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nomi</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sektor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Smena</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Soni</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Faktor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIssues.filter(i => i.status === 'ochiq').length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                            Ochiq muammo yo'q
                          </td>
                        </tr>
                      ) : (
                        filteredIssues.filter(i => i.status === 'ochiq').map((issue) => {
                          const statusColor = getStatusColor(issue.status)
                          return (
                            <tr
                              key={issue.id}
                              onClick={() => setSelectedIssue(issue)}
                              className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-3 text-sm">
                                <Badge className={getModuleColor(issue.module)}>{issue.module}</Badge>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-foreground">{issue.code}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{issue.name}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{issue.sector}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{issue.shift}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{issue.count}</td>
                              <td className="px-4 py-3 text-sm">
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
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Module Badge */}
                  <div className="flex items-center gap-2">
                    <Badge className={getModuleColor(selectedIssue.module)}>{selectedIssue.module}</Badge>
                    {selectedIssue.gaRelated && <Badge className="bg-success text-white">GA bog'liq</Badge>}
                  </div>

                  {/* Issue Details */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nuqson kodi</p>
                      <p className="text-sm font-semibold text-foreground">{selectedIssue.code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nuqson nomi</p>
                      <p className="text-sm text-foreground">{selectedIssue.name}</p>
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
                        <Badge className={getRiskColor(selectedIssue.factor)}>{selectedIssue.factor}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Root Cause */}
                  {selectedIssue.rootCause && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Muammo kelib chiqish sababi</p>
                      <p className="text-sm text-foreground">{selectedIssue.rootCause}</p>
                    </div>
                  )}

                  {/* Action */}
                  {selectedIssue.action && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Chora-tadbir</p>
                      <p className="text-sm text-foreground">{selectedIssue.action}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-border space-y-2">
                    <Button
                      onClick={() => setShowTransferModal(true)}
                      className="w-full"
                      variant="outline"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Managerga yuborish
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Check className="w-4 h-4 mr-2" />
                      Hal qilish
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground">
                  Muammoni tanlang
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top 10 Defects Tab */}
        {activeTab === 'top10' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Top 10 nuqsonlar (batafsil)</h2>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Kod</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson nomi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Soni</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Faktor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Xavflilik</th>
                  </tr>
                </thead>
                <tbody>
                  {top10Defects.map((defect, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">{defect.code}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{defect.name}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">{defect.count}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className={getRiskColor(defect.factor)}>{defect.factor}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {defect.factor >= 20 ? (
                          <Badge className="bg-critical text-white">Yuqori</Badge>
                        ) : defect.factor >= 15 ? (
                          <Badge className="bg-warning text-white">O'rtacha</Badge>
                        ) : (
                          <Badge className="bg-success text-white">Past</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && selectedIssue && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold text-foreground">Muammoni managerga yuborish</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Managerga yuborilayotgan muammo</label>
                  <div className="bg-background border border-border rounded-lg p-3 text-sm">
                    <p className="font-semibold text-foreground">{selectedIssue.code} - {selectedIssue.name}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Izoh</label>
                  <textarea
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="Muammoning tavsifi va managerga berish sababi..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleTransferToManager} className="flex-1">
                  Yuborish
                </Button>
                <Button
                  onClick={() => setShowTransferModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Bekor qilish
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { gaMockIssues, drrIssuesForGAEngineer, drlIssuesForGAEngineer, gaEngineerSectors, gaIssueStatuses, gaRootCauseOptions, gaActionOptions, gaTransferTargets, gaEngineerFactorOptions } from '@/lib/mock-data'
import { ChevronLeft, ChevronRight, Trash2, Check, AlertTriangle, Clock, ArrowRight, TrendingUp, Send, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

export default function GAEngineerPage() {
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'open' | 'top10'>('dashboard')
  const [filterShift, setFilterShift] = useState<string>('')
  const [filterSector, setFilterSector] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterModule, setFilterModule] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'factor'>('date')
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Resolution form state
  const [resolutionForm, setResolutionForm] = useState({
    problemDescription: '',
    rootCause: '',
    immediateAction: '',
    mainAction: '',
    imageFile: null as File | null,
    decision: 'resolved' as 'resolved' | 'transfer',
    transferTarget: '',
    transferReason: '',
    transferNotes: '',
    priority: 'middle',
    dueDate: '',
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [processHistory, setProcessHistory] = useState<Array<{ timestamp: string; action: string }>>([])

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

  // Calculate KPIs
  const openIssues = allIssues.filter((i) => i.status === 'ochiq').length
  const drrIssues = allIssues.filter((i) => i.module === 'DRR').length
  const drlIssues = allIssues.filter((i) => i.module === 'DRL').length
  const inProgressIssues = allIssues.filter((i) => i.status === 'jarayonda').length
  const sentToManagerIssues = allIssues.filter((i) => i.status === 'managerga_yuborildi').length
  const closedIssues = allIssues.filter((i) => i.status === 'yopilgan').length
  const maxFactorIssue = allIssues.reduce((max, i) => i.factor > (max.factor || 0) ? i : max, { factor: 0 })

  // Charts data
  const sectorData = useMemo(() => {
    const sectors = ['TRIM', 'SHOSSE', 'FINAL', 'SUB']
    return sectors.map(sector => ({
      name: sector,
      soni: allIssues.filter(i => i.sector === sector).length,
    }))
  }, [])

  const shiftData = useMemo(() => {
    const shifts = ['A', 'B', 'D']
    return shifts.map(shift => ({
      name: `${shift} smena`,
      soni: allIssues.filter(i => i.shift === shift).length,
    }))
  }, [])

  const top10Defects = useMemo(() => {
    const defectMap = new Map()
    allIssues.forEach(issue => {
      const key = `${issue.code}-${issue.name}`
      if (defectMap.has(key)) {
        defectMap.get(key).count += issue.count
      } else {
        defectMap.set(key, {
          code: issue.code,
          name: issue.name,
          count: issue.count,
          factor: issue.factor,
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
      case 'managerga_yuborildi':
        return { bg: 'bg-primary/10', badge: 'bg-primary text-white', label: 'Managerga yuborildi' }
      case 'qayta_ishlashda':
        return { bg: 'bg-secondary/10', badge: 'bg-secondary text-white', label: 'Qayta ishlashda' }
      case 'yopilgan':
        return { bg: 'bg-success/10', badge: 'bg-success text-white', label: 'Yopilgan' }
      case 'kechikkan':
        return { bg: 'bg-orange-500/10', badge: 'bg-orange-500 text-white', label: 'Kechikkan' }
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

  const validateResolutionForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (resolutionForm.decision === 'resolved') {
      if (!resolutionForm.problemDescription.trim()) {
        errors.problemDescription = 'Muammo izohi majburiy'
      }
      if (!resolutionForm.rootCause.trim()) {
        errors.rootCause = 'Sabab majburiy'
      }
      if (!resolutionForm.immediateAction.trim()) {
        errors.immediateAction = 'Tezkor chora majburiy'
      }
      if (!resolutionForm.mainAction.trim()) {
        errors.mainAction = 'Chora-tadbir majburiy'
      }
      if (!resolutionForm.imageFile) {
        errors.imageFile = 'Rasm yuklash majburiy'
      }
    } else if (resolutionForm.decision === 'transfer') {
      if (!resolutionForm.transferTarget) {
        errors.transferTarget = 'Target eng majburiy'
      }
      if (!resolutionForm.transferReason.trim()) {
        errors.transferReason = 'Sabab majburiy'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleResolutionSubmit = () => {
    if (!validateResolutionForm()) return

    if (resolutionForm.decision === 'resolved') {
      addToHistory('Muammoni hal qilish formasini yubordi')
      setSuccessMessage('Muammo hal qilish formasini muvaffaqiyatli yuborildi')
      setShowResolutionModal(false)
    } else {
      addToHistory(`${gaTransferTargets.find(t => t.value === resolutionForm.transferTarget)?.label || 'Biror sex'} ga uzatildi`)
      setSuccessMessage('Muammo muvaffaqiyatli uzatildi')
      setShowResolutionModal(false)
    }

    setTimeout(() => setSuccessMessage(''), 3000)
    resetForm()
  }

  const addToHistory = (action: string) => {
    const now = new Date()
    setProcessHistory([
      ...processHistory,
      {
        timestamp: now.toLocaleTimeString('uz-UZ'),
        action,
      },
    ])
  }

  const resetForm = () => {
    setResolutionForm({
      problemDescription: '',
      rootCause: '',
      immediateAction: '',
      mainAction: '',
      imageFile: null,
      decision: 'resolved',
      transferTarget: '',
      transferReason: '',
      transferNotes: '',
      priority: 'middle',
      dueDate: '',
    })
    setFormErrors({})
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444']

  return (
    <div>
      <PageHeader
        title="GA Engineer paneli"
        description="GA muammolarini tahlil qilish va hal qilish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'GA Engineer paneli' },
        ]}
      />

      {successMessage && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
          {successMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Ochiq muammolar', value: openIssues, color: 'bg-critical', action: () => setActiveTab('open') },
          { label: 'DRR bog\'liq', value: drrIssues, color: 'bg-warning' },
          { label: 'DRL bog\'liq', value: drlIssues, color: 'bg-info' },
          { label: 'Jarayonda', value: inProgressIssues, color: 'bg-secondary' },
          { label: 'Managerga yuborildi', value: sentToManagerIssues, color: 'bg-primary' },
          { label: 'Eng yuqori faktor', value: maxFactorIssue.factor, color: 'bg-danger' },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={`${kpi.color}/10 border border-${kpi.color}/20 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
            onClick={kpi.action}
          >
            <p className="text-xs text-muted-foreground mb-2">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color === 'bg-critical' ? 'text-critical' : kpi.color === 'bg-warning' ? 'text-warning' : kpi.color === 'bg-info' ? 'text-info' : kpi.color === 'bg-primary' ? 'text-primary' : kpi.color === 'bg-secondary' ? 'text-secondary' : 'text-danger'}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Top 10 Defects Chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Top 10 nuqsonlar</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10Defects.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="code" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Distribution */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Sektorlar bo'yicha</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" labelLine={false} label={({ name, soni }) => `${name}: ${soni}`} outerRadius={80} fill="#8884d8" dataKey="soni">
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Open Issues Tab */}
      {activeTab === 'open' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Ochiq muammolar</h2>
                <button onClick={() => setActiveTab('dashboard')} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
                  <option value="">Barcha modullar</option>
                  <option value="GA">GA</option>
                  <option value="DRR">DRR</option>
                  <option value="DRL">DRL</option>
                </select>
                <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
                  <option value="">Barcha smenalar</option>
                  <option value="A">A smena</option>
                  <option value="B">B smena</option>
                  <option value="D">D smena</option>
                </select>
                <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
                  <option value="">Barcha sektorlar</option>
                  {gaEngineerSectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground">
                  <option value="">Barcha statuslar</option>
                  {gaIssueStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIssues.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Muammo topilmadi
                      </td>
                    </tr>
                  ) : (
                    sortedIssues.map((issue) => {
                      const statusColor = gaIssueStatuses.find(s => s.value === issue.status)
                      return (
                        <tr key={issue.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedIssue(issue)}>
                          <td className="px-4 py-3 text-sm"><Badge className={getModuleColor(issue.module)}>{issue.module}</Badge></td>
                          <td className="px-4 py-3 text-sm font-semibold text-foreground">{issue.code}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{issue.name}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{issue.sector}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{issue.shift} smena</td>
                          <td className="px-4 py-3 text-sm text-foreground">{issue.count}</td>
                          <td className="px-4 py-3 text-sm"><Badge className={getRiskColor(issue.factor)}>{issue.factor}</Badge></td>
                          <td className="px-4 py-3 text-sm"><Badge className={statusColor?.color || 'bg-muted'}>{statusColor?.label}</Badge></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Issue Detail Panel */}
          <div className="lg:col-span-1">
            {selectedIssue ? (
              <div className="bg-card border border-border rounded-xl p-6 space-y-4 sticky top-20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Muammo tafsiloti</h3>
                  <button onClick={() => setSelectedIssue(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Modul</p>
                    <Badge className={getModuleColor(selectedIssue.module)}>{selectedIssue.module}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kod: {selectedIssue.code}</p>
                    <p className="font-semibold text-foreground">{selectedIssue.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Sektor</p>
                      <p className="font-semibold">{selectedIssue.sector}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Smena</p>
                      <p className="font-semibold">{selectedIssue.shift}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Faktor</p>
                    <Badge className={getRiskColor(selectedIssue.factor)}>{selectedIssue.factor}</Badge>
                  </div>
                </div>

                {selectedIssue.rootCause && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Sabab</p>
                    <p className="text-sm text-foreground">{selectedIssue.rootCause}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-border space-y-2">
                  <Button onClick={() => setShowResolutionModal(true)} className="w-full">
                    <Check className="w-4 h-4 mr-2" />
                    Muammoni hal qilish
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

      {/* Resolution Modal */}
      {showResolutionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card">
              <h2 className="text-lg font-bold text-foreground">Muammoni hal qilish</h2>
              <button onClick={() => { setShowResolutionModal(false); resetForm() }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Muammo izohi */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Muammo izohi *</label>
                <textarea
                  value={resolutionForm.problemDescription}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, problemDescription: e.target.value })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.problemDescription ? 'border-critical' : 'border-border'}`}
                  rows={3}
                  placeholder="Muammoning to'liq izohi"
                />
                {formErrors.problemDescription && <p className="text-xs text-critical mt-1">{formErrors.problemDescription}</p>}
              </div>

              {/* Muammo kelib chiqish sababi */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Muammo kelib chiqish sababi *</label>
                <textarea
                  value={resolutionForm.rootCause}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, rootCause: e.target.value })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.rootCause ? 'border-critical' : 'border-border'}`}
                  rows={3}
                  placeholder="Ildiz sababni tafsil qiling"
                />
                {formErrors.rootCause && <p className="text-xs text-critical mt-1">{formErrors.rootCause}</p>}
              </div>

              {/* Tezkor chora-tadbir */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tezkor chora-tadbir *</label>
                <textarea
                  value={resolutionForm.immediateAction}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, immediateAction: e.target.value })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.immediateAction ? 'border-critical' : 'border-border'}`}
                  rows={2}
                  placeholder="Darhol bajarilgan choralar"
                />
                {formErrors.immediateAction && <p className="text-xs text-critical mt-1">{formErrors.immediateAction}</p>}
              </div>

              {/* Asosiy chora-tadbir */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Chora-tadbir (asosiy rejalar) *</label>
                <textarea
                  value={resolutionForm.mainAction}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, mainAction: e.target.value })}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.mainAction ? 'border-critical' : 'border-border'}`}
                  rows={3}
                  placeholder="To'liq bartaraf qilish rejasi"
                />
                {formErrors.mainAction && <p className="text-xs text-critical mt-1">{formErrors.mainAction}</p>}
              </div>

              {/* Rasm yuklash */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Hal qilinganligi rasmi (rasm) *</label>
                <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${formErrors.imageFile ? 'border-critical' : 'border-border hover:border-primary'}`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setResolutionForm({ ...resolutionForm, imageFile: file })
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Rasm tanlang yoki su'rting</p>
                    {resolutionForm.imageFile && <p className="text-xs text-primary font-medium">{resolutionForm.imageFile.name}</p>}
                  </label>
                </div>
                {formErrors.imageFile && <p className="text-xs text-critical mt-1">{formErrors.imageFile}</p>}
              </div>

              {/* Qaror */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Qaror *</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="decision"
                      value="resolved"
                      checked={resolutionForm.decision === 'resolved'}
                      onChange={(e) => setResolutionForm({ ...resolutionForm, decision: 'resolved' })}
                    />
                    <span className="text-sm text-foreground">Muammo hal qilindi</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="decision"
                      value="transfer"
                      checked={resolutionForm.decision === 'transfer'}
                      onChange={(e) => setResolutionForm({ ...resolutionForm, decision: 'transfer' })}
                    />
                    <span className="text-sm text-foreground">Boshqa sexga tegishli</span>
                  </label>
                </div>
              </div>

              {/* Transfer fields */}
              {resolutionForm.decision === 'transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Qaysi sexga yuborilsin *</label>
                    <select
                      value={resolutionForm.transferTarget}
                      onChange={(e) => setResolutionForm({ ...resolutionForm, transferTarget: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.transferTarget ? 'border-critical' : 'border-border'}`}
                    >
                      <option value="">Tanlang...</option>
                      {gaTransferTargets.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {formErrors.transferTarget && <p className="text-xs text-critical mt-1">{formErrors.transferTarget}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Sabab *</label>
                    <textarea
                      value={resolutionForm.transferReason}
                      onChange={(e) => setResolutionForm({ ...resolutionForm, transferReason: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary ${formErrors.transferReason ? 'border-critical' : 'border-border'}`}
                      rows={2}
                      placeholder="Nega bu sexga uzatilmoqda?"
                    />
                    {formErrors.transferReason && <p className="text-xs text-critical mt-1">{formErrors.transferReason}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Izoh</label>
                    <textarea
                      value={resolutionForm.transferNotes}
                      onChange={(e) => setResolutionForm({ ...resolutionForm, transferNotes: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      placeholder="Qo'shimcha izoh"
                    />
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button onClick={handleResolutionSubmit} className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  {resolutionForm.decision === 'resolved' ? 'Managerga tasdiqlash uchun yuborish' : 'Engineerga yuborish'}
                </Button>
                <Button onClick={() => { setShowResolutionModal(false); resetForm() }} variant="outline" className="flex-1">
                  Bekor qilish
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

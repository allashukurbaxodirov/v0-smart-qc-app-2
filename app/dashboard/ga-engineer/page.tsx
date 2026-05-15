'use client'

import React, { useState, useMemo, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA, GCARecord } from '@/lib/gca-context'
import { gaTransferTargets } from '@/lib/mock-data'
import {
  Check,
  X,
  Upload,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  ClipboardList,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Tip ──────────────────────────────────────────────────────────────────────
type ResolutionStatus = 'ochiq' | 'jarayonda' | 'yopilgan' | 'uzatilgan'

interface Resolution {
  status: ResolutionStatus
  problemDescription: string
  rootCause: string
  immediateAction: string
  mainAction: string
  decision: 'resolved' | 'transfer'
  transferTarget: string
  transferReason: string
  resolvedAt: string
}

const RESOLUTION_TYPE = 'ga' as const

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
function getFactorBadge(factor: number) {
  if (factor === 50) return 'bg-critical text-white'
  if (factor === 20) return 'bg-warning text-white'
  if (factor === 10) return 'bg-blue-500 text-white'
  return 'bg-success text-white'
}

function getStatusInfo(status: ResolutionStatus) {
  switch (status) {
    case 'ochiq':
      return { label: 'Ochiq', cls: 'bg-critical text-white', icon: AlertTriangle }
    case 'jarayonda':
      return { label: 'Jarayonda', cls: 'bg-warning text-white', icon: Clock }
    case 'yopilgan':
      return { label: 'Bartaraf etildi', cls: 'bg-success text-white', icon: CheckCircle2 }
    case 'uzatilgan':
      return { label: 'Uzatilgan', cls: 'bg-primary text-white', icon: ArrowRightLeft }
  }
}

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function GAEngineerPage() {
  const { records, loading, refresh } = useGCA()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  // API dan resolutionlarni yuklash
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({})
  useEffect(() => {
    // Avval localStorage ni ko'chir (birinchi yuklanish)
    try {
      const old = localStorage.getItem('ga_engineer_resolutions')
      if (old) {
        const parsed = JSON.parse(old)
        // Eski localStorage ma'lumotlarini API ga ko'chirish
        Object.entries(parsed).forEach(([recordId, res]: [string, any]) => {
          fetch('/api/resolutions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...res, recordId, type: RESOLUTION_TYPE }),
          }).catch(() => {})
        })
        localStorage.removeItem('ga_engineer_resolutions')
      }
    } catch {}
    // API dan yuklash
    fetch(`/api/resolutions?type=${RESOLUTION_TYPE}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setResolutions(data))
      .catch(() => {})
  }, [])

  const saveResolutions = async (updated: Record<string, Resolution>, newEntry?: { recordId: string; res: Resolution }) => {
    setResolutions(updated)
    if (newEntry) {
      try {
        await fetch('/api/resolutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newEntry.res, recordId: newEntry.recordId, type: RESOLUTION_TYPE }),
        })
      } catch {}
    }
  }

  // Filtirlar
  const [filterShop, setFilterShop]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFactor, setFilterFactor] = useState('')
  const [sortBy, setSortBy]             = useState<'date' | 'factor'>('factor')
  const [activeTab, setActiveTab]       = useState<'list' | 'stats'>('list')

  // Tanlangan yozuv va modal
  const [selectedRecord, setSelectedRecord] = useState<GCARecord | null>(null)
  const [showModal, setShowModal]           = useState(false)
  const [successMsg, setSuccessMsg]         = useState('')

  // Forma holati
  const [form, setForm] = useState({
    problemDescription: '',
    rootCause: '',
    immediateAction: '',
    mainAction: '',
    imageFile: null as File | null,
    decision: 'resolved' as 'resolved' | 'transfer',
    transferTarget: '',
    transferReason: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Har bir yozuv uchun status
  const getStatus = (id: string): ResolutionStatus =>
    resolutions[id]?.status ?? 'ochiq'

  // Filterlangan va tartiblangan yozuvlar
  const filtered = useMemo(() => {
    let list = [...records]
    if (filterShop)   list = list.filter((r) => r.shop === filterShop)
    if (filterFactor) list = list.filter((r) => r.factor === Number(filterFactor))
    if (filterStatus) list = list.filter((r) => getStatus(r.id) === filterStatus)
    list.sort((a, b) =>
      sortBy === 'factor'
        ? b.factor - a.factor
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    return list
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, filterShop, filterStatus, filterFactor, sortBy, resolutions])

  // KPI
  const total      = records.length
  const open       = records.filter((r) => getStatus(r.id) === 'ochiq').length
  const closed     = records.filter((r) => getStatus(r.id) === 'yopilgan').length
  const inProgress = records.filter((r) => getStatus(r.id) === 'jarayonda').length
  const transferred= records.filter((r) => getStatus(r.id) === 'uzatilgan').length
  const f50Count   = records.filter((r) => r.factor === 50).length

  // Forma validatsiya
  const validate = () => {
    const e: Record<string, string> = {}
    if (form.decision === 'resolved') {
      if (!form.problemDescription.trim()) e.problemDescription = 'Majburiy maydon'
      if (!form.rootCause.trim())          e.rootCause          = 'Majburiy maydon'
      if (!form.immediateAction.trim())    e.immediateAction    = 'Majburiy maydon'
      if (!form.mainAction.trim())         e.mainAction         = 'Majburiy maydon'
    } else {
      if (!form.transferTarget)            e.transferTarget     = 'Majburiy maydon'
      if (!form.transferReason.trim())     e.transferReason     = 'Majburiy maydon'
    }
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate() || !selectedRecord) return

    const status: ResolutionStatus =
      form.decision === 'resolved' ? 'yopilgan' : 'uzatilgan'

    const newRes: Resolution = {
      status,
      problemDescription: form.problemDescription,
      rootCause:          form.rootCause,
      immediateAction:    form.immediateAction,
      mainAction:         form.mainAction,
      decision:           form.decision,
      transferTarget:     form.transferTarget,
      transferReason:     form.transferReason,
      resolvedAt:         new Date().toISOString(),
    }

    const updated = { ...resolutions, [selectedRecord.id]: newRes }
    saveResolutions(updated, { recordId: selectedRecord.id, res: newRes })

    setSuccessMsg(
      form.decision === 'resolved'
        ? 'Muammo bartaraf etildi va managerga yuborildi ✓'
        : `Muammo ${gaTransferTargets.find((t) => t.value === form.transferTarget)?.label ?? 'sehga'} uzatildi ✓`
    )
    setShowModal(false)
    setSelectedRecord(null)
    resetForm()
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const resetForm = () => {
    setForm({
      problemDescription: '',
      rootCause: '',
      immediateAction: '',
      mainAction: '',
      imageFile: null,
      decision: 'resolved',
      transferTarget: '',
      transferReason: '',
    })
    setFormErrors({})
  }

  const openModal = (record: GCARecord) => {
    setSelectedRecord(record)
    resetForm()
    setShowModal(true)
  }

  // ── Ko'rinish ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="GA Engineer paneli"
        description="GCA Auditor aniqlagan nuqsonlarni bartaraf etish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'GA Engineer paneli' },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* Muvaffaqiyat xabari */}
        {successMsg && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <p className="text-sm font-medium text-success">{successMsg}</p>
          </div>
        )}

        {/* KPI kartochkalar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Jami nuqsonlar',    value: total,       cls: 'text-foreground',  border: 'border-border'          },
            { label: 'Ochiq',             value: open,        cls: 'text-critical',    border: 'border-critical/40'     },
            { label: 'Jarayonda',         value: inProgress,  cls: 'text-warning',     border: 'border-warning/40'      },
            { label: 'Bartaraf etildi',   value: closed,      cls: 'text-success',     border: 'border-success/40'      },
            { label: 'Uzatilgan',         value: transferred, cls: 'text-primary',     border: 'border-primary/40'      },
            { label: 'Faktor 50 (xavfli)',value: f50Count,    cls: 'text-critical',    border: 'border-critical/40'     },
          ].map((k) => (
            <div key={k.label} className={`bg-card border-2 ${k.border} rounded-xl p-4`}>
              <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tab tugmalar */}
        <div className="inline-flex bg-card border border-border rounded-lg p-1 gap-1">
          {([
            { key: 'list',  label: "Nuqsonlar ro'yxati", icon: ClipboardList },
            { key: 'stats', label: 'Statistika',          icon: CheckCircle2 },
          ] as { key: 'list' | 'stats'; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── RO'YXAT TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* Filtirlar */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterShop}
                onChange={(e) => setFilterShop(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
              >
                <option value="">Barcha sehlar</option>
                {['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filterFactor}
                onChange={(e) => setFilterFactor(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
              >
                <option value="">Barcha faktorlar</option>
                {[50, 20, 10, 5].map((f) => (
                  <option key={f} value={f}>Faktor {f}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
              >
                <option value="">Barcha statuslar</option>
                <option value="ochiq">Ochiq</option>
                <option value="jarayonda">Jarayonda</option>
                <option value="yopilgan">Bartaraf etildi</option>
                <option value="uzatilgan">Uzatilgan</option>
              </select>

              <div className="inline-flex bg-card border border-border rounded-lg p-1 gap-1 ml-auto">
                {(['factor', 'date'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSortBy(k)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      sortBy === k
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {k === 'factor' ? "Faktor bo'yicha" : "Sana bo'yicha"}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Yangilanmoqda...' : 'Yangilash'}
              </button>
            </div>

            {/* Jadval */}
            {loading ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
                Ma'lumotlar yuklanmoqda...
              </div>
            ) : records.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <p className="text-muted-foreground text-sm">GCA Auditor hali nuqson kiritmagan.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sektor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Kod</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson nomi</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Soni</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Faktor</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Harakat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">
                            Filter bo'yicha natija topilmadi
                          </td>
                        </tr>
                      ) : (
                        filtered.map((record) => {
                          const status   = getStatus(record.id)
                          const statusInfo = getStatusInfo(status)
                          const res      = resolutions[record.id]
                          const isDone   = status === 'yopilgan' || status === 'uzatilgan'

                          return (
                            <tr
                              key={record.id}
                              className={`transition-colors hover:bg-muted/30 ${
                                status === 'yopilgan' ? 'opacity-60' : ''
                              }`}
                            >
                              <td className="px-4 py-3 text-sm text-muted-foreground">{record.date}</td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">{record.shop}</td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {record.sector ? (
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                    {record.sector}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-foreground">{record.code}</td>
                              <td className="px-4 py-3 text-sm text-foreground">{record.codeName}</td>
                              <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{record.count}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={getFactorBadge(record.factor)}>{record.factor}</Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={statusInfo.cls}>{statusInfo.label}</Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isDone ? (
                                  <span className="text-xs text-muted-foreground">
                                    {res?.resolvedAt
                                      ? new Date(res.resolvedAt).toLocaleDateString('uz-UZ')
                                      : '—'}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openModal(record)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/80 transition-colors"
                                  >
                                    <Check className="w-3 h-3" />
                                    Bartaraf etish
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Jadval pastki qismi */}
                <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                  Jami {filtered.length} ta yozuv ko'rsatilmoqda
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STATISTIKA TAB ────────────────────────────────────────────────── */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sehlar bo'yicha */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Sehlar bo'yicha nuqsonlar</h3>
              <div className="space-y-3">
                {['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'].map((shop) => {
                  const shopRecs  = records.filter((r) => r.shop === shop)
                  const shopOpen  = shopRecs.filter((r) => getStatus(r.id) === 'ochiq').length
                  const shopDone  = shopRecs.filter((r) => getStatus(r.id) === 'yopilgan').length
                  const shopTotal = shopRecs.length
                  const pct       = shopTotal > 0 ? Math.round((shopDone / shopTotal) * 100) : 0

                  return (
                    <div key={shop}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{shop}</span>
                        <span className="text-muted-foreground">
                          {shopDone}/{shopTotal} bartaraf ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-success transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {shopOpen > 0 && (
                        <p className="text-xs text-critical mt-0.5">{shopOpen} ta ochiq</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Faktor bo'yicha */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Faktor bo'yicha holat</h3>
              <div className="space-y-4">
                {[
                  { factor: 50, label: 'Faktor 50', cls: 'bg-critical', text: 'text-critical' },
                  { factor: 20, label: 'Faktor 20', cls: 'bg-warning',  text: 'text-warning'  },
                  { factor: 10, label: 'Faktor 10', cls: 'bg-blue-500', text: 'text-blue-500' },
                  { factor: 5,  label: 'Faktor 5',  cls: 'bg-success',  text: 'text-success'  },
                ].map(({ factor, label, cls, text }) => {
                  const fRecs  = records.filter((r) => r.factor === factor)
                  const fOpen  = fRecs.filter((r) => getStatus(r.id) === 'ochiq').length
                  const fDone  = fRecs.filter((r) => getStatus(r.id) === 'yopilgan').length
                  const fTotal = fRecs.length

                  return (
                    <div key={factor} className="flex items-center gap-4">
                      <div className={`w-2 h-8 rounded-full ${cls}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className={`font-semibold ${text}`}>{label}</span>
                          <span className="text-muted-foreground">{fTotal} ta</span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="text-critical">{fOpen} ochiq</span>
                          <span className="text-success">{fDone} bartaraf</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Oxirgi bartaraf etilganlar */}
            <div className="bg-card border border-border rounded-xl p-6 md:col-span-2">
              <h3 className="text-base font-bold text-foreground mb-4">Oxirgi bartaraf etilgan nuqsonlar</h3>
              {Object.entries(resolutions).length === 0 ? (
                <p className="text-sm text-muted-foreground">Hali bartaraf etilgan nuqson yo'q</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground">Sana</th>
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground">Sehi</th>
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground">Nuqson</th>
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground">Faktor</th>
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground">Qaror</th>
                        <th className="px-3 py-2 text-left text-xs text-muted-foreground">Bartaraf sanasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(resolutions)
                        .filter(([, res]) => res.status === 'yopilgan' || res.status === 'uzatilgan')
                        .sort(([, a], [, b]) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime())
                        .slice(0, 10)
                        .map(([id, res]) => {
                          const rec = records.find((r) => r.id === id)
                          if (!rec) return null
                          const si = getStatusInfo(res.status)
                          return (
                            <tr key={id} className="hover:bg-muted/30">
                              <td className="px-3 py-2 text-muted-foreground">{rec.date}</td>
                              <td className="px-3 py-2 font-medium text-foreground">{rec.shop}</td>
                              <td className="px-3 py-2 text-foreground">{rec.codeName}</td>
                              <td className="px-3 py-2">
                                <Badge className={getFactorBadge(rec.factor)}>{rec.factor}</Badge>
                              </td>
                              <td className="px-3 py-2">
                                <Badge className={si.cls}>{si.label}</Badge>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {new Date(res.resolvedAt).toLocaleString('uz-UZ')}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


      </div>

      {/* ── BARTARAF ETISH MODALI ───────────────────────────────────────────── */}
      {showModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal sarlavha */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Nuqsonni bartaraf etish</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedRecord.shop} — Kod {selectedRecord.code} — {selectedRecord.codeName}
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nuqson ma'lumotlari */}
            <div className="px-6 pt-4 pb-2">
              <div className="grid grid-cols-3 gap-3 bg-muted/30 rounded-lg p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Sehi</p>
                  <p className="font-semibold text-foreground">{selectedRecord.shop}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Soni</p>
                  <p className="font-semibold text-foreground">{selectedRecord.count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Faktor</p>
                  <Badge className={getFactorBadge(selectedRecord.factor)}>{selectedRecord.factor}</Badge>
                </div>
              </div>
            </div>

            {/* Forma */}
            <div className="px-6 pb-6 space-y-4">

              {/* Muammo izohi */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Muammo izohi <span className="text-critical">*</span>
                </label>
                <textarea
                  value={form.problemDescription}
                  onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
                  rows={3}
                  placeholder="Nuqsonning to'liq tavsifi..."
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                    formErrors.problemDescription ? 'border-critical' : 'border-border'
                  }`}
                />
                {formErrors.problemDescription && (
                  <p className="text-xs text-critical mt-1">{formErrors.problemDescription}</p>
                )}
              </div>

              {/* Ildiz sabab */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Ildiz sabab <span className="text-critical">*</span>
                </label>
                <textarea
                  value={form.rootCause}
                  onChange={(e) => setForm({ ...form, rootCause: e.target.value })}
                  rows={3}
                  placeholder="Nuqson kelib chiqishining asosiy sababi..."
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                    formErrors.rootCause ? 'border-critical' : 'border-border'
                  }`}
                />
                {formErrors.rootCause && (
                  <p className="text-xs text-critical mt-1">{formErrors.rootCause}</p>
                )}
              </div>

              {/* Tezkor chora */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tezkor chora-tadbir <span className="text-critical">*</span>
                </label>
                <textarea
                  value={form.immediateAction}
                  onChange={(e) => setForm({ ...form, immediateAction: e.target.value })}
                  rows={2}
                  placeholder="Darhol ko'rilgan choralar..."
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                    formErrors.immediateAction ? 'border-critical' : 'border-border'
                  }`}
                />
                {formErrors.immediateAction && (
                  <p className="text-xs text-critical mt-1">{formErrors.immediateAction}</p>
                )}
              </div>

              {/* Asosiy chora */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Asosiy chora-tadbir (doimiy yechim) <span className="text-critical">*</span>
                </label>
                <textarea
                  value={form.mainAction}
                  onChange={(e) => setForm({ ...form, mainAction: e.target.value })}
                  rows={3}
                  placeholder="Qayta takrorlanmasligi uchun doimiy yechim..."
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                    formErrors.mainAction ? 'border-critical' : 'border-border'
                  }`}
                />
                {formErrors.mainAction && (
                  <p className="text-xs text-critical mt-1">{formErrors.mainAction}</p>
                )}
              </div>

              {/* Rasm yuklash */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rasm (ixtiyoriy)</label>
                <label className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Rasm tanlang yoki torting</span>
                  {form.imageFile && (
                    <span className="text-xs text-primary font-medium">{form.imageFile.name}</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setForm({ ...form, imageFile: f })
                    }}
                  />
                </label>
              </div>

              {/* Qaror */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Qaror</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { val: 'resolved', label: 'Bartaraf etildi', icon: CheckCircle2, cls: 'border-success text-success bg-success/5' },
                    { val: 'transfer', label: "Boshqa sehga o'tkazish", icon: ArrowRightLeft, cls: 'border-primary text-primary bg-primary/5' },
                  ] as const).map(({ val, label, icon: Icon, cls }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm({ ...form, decision: val })}
                      className={`flex items-center gap-2 p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        form.decision === val ? cls : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transfer maydonlari */}
              {form.decision === 'transfer' && (
                <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Qaysi sehga <span className="text-critical">*</span>
                    </label>
                    <select
                      value={form.transferTarget}
                      onChange={(e) => setForm({ ...form, transferTarget: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground ${
                        formErrors.transferTarget ? 'border-critical' : 'border-border'
                      }`}
                    >
                      <option value="">Tanlang...</option>
                      {gaTransferTargets.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {formErrors.transferTarget && (
                      <p className="text-xs text-critical mt-1">{formErrors.transferTarget}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      O'tkazish sababi <span className="text-critical">*</span>
                    </label>
                    <textarea
                      value={form.transferReason}
                      onChange={(e) => setForm({ ...form, transferReason: e.target.value })}
                      rows={2}
                      placeholder="Nega bu sehga o'tkazilmoqda?"
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground resize-none ${
                        formErrors.transferReason ? 'border-critical' : 'border-border'
                      }`}
                    />
                    {formErrors.transferReason && (
                      <p className="text-xs text-critical mt-1">{formErrors.transferReason}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Yuborish tugmalari */}
              <div className="flex gap-3 pt-2 border-t border-border">
                <Button onClick={handleSubmit} className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  {form.decision === 'resolved'
                    ? 'Managerga yuborish'
                    : "Sehga o'tkazish"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowModal(false); resetForm() }}
                >
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

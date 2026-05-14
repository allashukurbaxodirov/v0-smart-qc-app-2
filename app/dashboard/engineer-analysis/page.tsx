'use client'

import { useState, useEffect, useMemo } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA } from '@/lib/gca-context'
import { useDRecords } from '@/lib/d-records-context'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  ArrowRightLeft,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart2,
  ClipboardList,
  Activity,
  ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'

// ─── Tiplar ───────────────────────────────────────────────────────────────────
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

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
function getFactorBadge(factor: number) {
  if (factor === 50) return 'bg-critical text-white'
  if (factor === 20) return 'bg-warning text-white'
  if (factor === 10) return 'bg-blue-500 text-white'
  return 'bg-success text-white'
}

function getStatusInfo(status: ResolutionStatus) {
  switch (status) {
    case 'ochiq':      return { label: 'Ochiq',           cls: 'bg-critical text-white', icon: AlertTriangle }
    case 'jarayonda':  return { label: 'Jarayonda',       cls: 'bg-warning text-white',  icon: Clock         }
    case 'yopilgan':   return { label: 'Bartaraf etildi', cls: 'bg-success text-white',  icon: CheckCircle2  }
    case 'uzatilgan':  return { label: 'Uzatilgan',       cls: 'bg-primary text-white',  icon: ArrowRightLeft}
  }
}

// ─── KPI kartochka ────────────────────────────────────────────────────────────
function KpiCard({
  label, value, cls, border, sub,
}: { label: string; value: number; cls: string; border: string; sub?: string }) {
  return (
    <div className={`bg-card border-2 ${border} rounded-xl p-4`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{done}/{total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className="h-2 rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function EngineerAnalysisPage() {
  const { records: gcaRecords } = useGCA()
  const { records: dRecords }   = useDRecords()

  // localStorage dan resolutionlarni yuklash
  const [gaRes,      setGaRes]      = useState<Record<string, Resolution>>({})
  const [weldingRes, setWeldingRes] = useState<Record<string, Resolution>>({})

  useEffect(() => {
    try {
      const g = localStorage.getItem('ga_engineer_resolutions')
      if (g) setGaRes(JSON.parse(g))
    } catch {}
    try {
      const w = localStorage.getItem('welding_engineer_resolutions')
      if (w) setWeldingRes(JSON.parse(w))
    } catch {}
  }, [])

  const [activeTab, setActiveTab] = useState<'overview' | 'ga' | 'welding' | 'history'>('overview')

  // ── GA engineer statistikasi ───────────────────────────────────────────────
  const gaStats = useMemo(() => {
    const total      = gcaRecords.length
    const resolved   = gcaRecords.filter((r) => gaRes[r.id]?.status === 'yopilgan').length
    const transferred= gcaRecords.filter((r) => gaRes[r.id]?.status === 'uzatilgan').length
    const inProgress = gcaRecords.filter((r) => gaRes[r.id]?.status === 'jarayonda').length
    const open       = gcaRecords.filter((r) => !gaRes[r.id] || gaRes[r.id].status === 'ochiq').length
    const f50        = gcaRecords.filter((r) => r.factor === 50).length
    const f50resolved= gcaRecords.filter((r) => r.factor === 50 && gaRes[r.id]?.status === 'yopilgan').length
    return { total, resolved, transferred, inProgress, open, f50, f50resolved }
  }, [gcaRecords, gaRes])

  // ── Welding engineer statistikasi ─────────────────────────────────────────
  const weldingDRecs = useMemo(() => dRecords.filter((r) => r.shop === 'WELDING-1' || r.shop === 'WELDING-2'), [dRecords])
  const wStats = useMemo(() => {
    const total       = weldingDRecs.length
    const resolved    = weldingDRecs.filter((r) => weldingRes[r.id]?.status === 'yopilgan').length
    const transferred = weldingDRecs.filter((r) => weldingRes[r.id]?.status === 'uzatilgan').length
    const inProgress  = weldingDRecs.filter((r) => weldingRes[r.id]?.status === 'jarayonda').length
    const open        = weldingDRecs.filter((r) => !weldingRes[r.id] || weldingRes[r.id].status === 'ochiq').length
    const f50         = weldingDRecs.filter((r) => r.factor === 50).length
    const f50resolved = weldingDRecs.filter((r) => r.factor === 50 && weldingRes[r.id]?.status === 'yopilgan').length
    return { total, resolved, transferred, inProgress, open, f50, f50resolved }
  }, [weldingDRecs, weldingRes])

  // ── Barcha hal qilingan yozuvlar (tarix uchun) ────────────────────────────
  const historyItems = useMemo(() => {
    const gaItems = Object.entries(gaRes)
      .filter(([, res]) => res.status === 'yopilgan' || res.status === 'uzatilgan')
      .map(([id, res]) => {
        const rec = gcaRecords.find((r) => r.id === id)
        if (!rec) return null
        return { id, rec, res, engineer: 'GA Engineer', source: 'GCA' as const }
      })
      .filter(Boolean) as { id: string; rec: typeof gcaRecords[0]; res: Resolution; engineer: string; source: 'GCA' }[]

    const wItems = Object.entries(weldingRes)
      .filter(([, res]) => res.status === 'yopilgan' || res.status === 'uzatilgan')
      .map(([id, res]) => {
        const rec = dRecords.find((r) => r.id === id)
        if (!rec) return null
        return { id, rec, res, engineer: 'Welding Engineer', source: 'D-Record' as const }
      })
      .filter(Boolean) as { id: string; rec: typeof dRecords[0]; res: Resolution; engineer: string; source: 'D-Record' }[]

    return [...gaItems, ...wItems].sort(
      (a, b) => new Date(b.res.resolvedAt).getTime() - new Date(a.res.resolvedAt).getTime()
    )
  }, [gaRes, weldingRes, gcaRecords, dRecords])

  // ── Sehlar bo'yicha GA statistikasi ───────────────────────────────────────
  const gaShops = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA']
  const wShops  = ['WELDING-1', 'WELDING-2', 'PRESS SHOP']

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Muhandislar tahlili"
        description="GA va Welding muhandislari hal qilgan muammolar statistikasi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Muhandislar tahlili' },
        ]}
      />

      <div className="p-6 space-y-6">
        <Link href="/dashboard/manager">
          <button className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Rahbar paneliga qaytish
          </button>
        </Link>

        {/* ── UMUMIY KPI ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            label="Jami muammolar"
            value={gaStats.total + wStats.total}
            cls="text-foreground"
            border="border-border"
          />
          <KpiCard
            label="Bartaraf etildi"
            value={gaStats.resolved + wStats.resolved}
            cls="text-success"
            border="border-success/40"
            sub="Muvaffaqiyatli yopilgan"
          />
          <KpiCard
            label="Uzatilgan"
            value={gaStats.transferred + wStats.transferred}
            cls="text-primary"
            border="border-primary/40"
            sub="Boshqa sehga o'tkazilgan"
          />
          <KpiCard
            label="Jarayonda"
            value={gaStats.inProgress + wStats.inProgress}
            cls="text-warning"
            border="border-warning/40"
          />
          <KpiCard
            label="Ochiq (hal qilinmagan)"
            value={gaStats.open + wStats.open}
            cls="text-critical"
            border="border-critical/40"
          />
          <KpiCard
            label="Faktor 50 (xavfli)"
            value={gaStats.f50 + wStats.f50}
            cls="text-critical"
            border="border-critical/40"
            sub={`${gaStats.f50resolved + wStats.f50resolved} ta bartaraf etildi`}
          />
        </div>

        {/* ── TAB BAR ───────────────────────────────────────────────────── */}
        <div className="inline-flex bg-card border border-border rounded-lg p-1 gap-1 flex-wrap">
          {([
            { key: 'overview', label: "Umumiy ko'rinish", icon: Activity       },
            { key: 'ga',       label: 'GA Engineer',      icon: TrendingUp     },
            { key: 'welding',  label: 'Welding Engineer', icon: BarChart2      },
            { key: 'history',  label: 'Tarix',            icon: ClipboardList  },
          ] as { key: typeof activeTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
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

        {/* ── UMUMIY KO'RINISH ──────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GA Engineer karta */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">GA Engineer</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">GCA Auditor nuqsonlari asosida</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Jami',          value: gaStats.total,       cls: 'text-foreground' },
                  { label: 'Bartaraf',      value: gaStats.resolved,    cls: 'text-success'    },
                  { label: 'Uzatilgan',     value: gaStats.transferred, cls: 'text-primary'    },
                  { label: 'Ochiq',         value: gaStats.open,        cls: 'text-critical'   },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Bartaraf etish darajasi</p>
                <ProgressBar done={gaStats.resolved + gaStats.transferred} total={gaStats.total} />
              </div>

              {/* Sehlar bo'yicha mini */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sehlar bo'yicha</p>
                {gaShops.map((shop) => {
                  const shopR = gcaRecords.filter((r) => r.shop === shop)
                  const done  = shopR.filter((r) => gaRes[r.id]?.status === 'yopilgan' || gaRes[r.id]?.status === 'uzatilgan').length
                  return (
                    <div key={shop} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 truncate">{shop}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{ width: shopR.length > 0 ? `${Math.round((done / shopR.length) * 100)}%` : '0%' }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {done}/{shopR.length}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Welding Engineer karta */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Welding Engineer</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">D10/D20 yozuvlari asosida</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <BarChart2 className="w-5 h-5 text-warning" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Jami',      value: wStats.total,       cls: 'text-foreground' },
                  { label: 'Bartaraf',  value: wStats.resolved,    cls: 'text-success'    },
                  { label: 'Uzatilgan', value: wStats.transferred, cls: 'text-primary'    },
                  { label: 'Ochiq',     value: wStats.open,        cls: 'text-critical'   },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Bartaraf etish darajasi</p>
                <ProgressBar done={wStats.resolved + wStats.transferred} total={wStats.total} />
              </div>

              {/* Sehlar bo'yicha mini */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sehlar bo'yicha</p>
                {wShops.map((shop) => {
                  const shopR = weldingDRecs.filter((r) => r.shop === shop)
                  const done  = shopR.filter((r) => weldingRes[r.id]?.status === 'yopilgan' || weldingRes[r.id]?.status === 'uzatilgan').length
                  return (
                    <div key={shop} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 truncate">{shop}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-warning transition-all"
                          style={{ width: shopR.length > 0 ? `${Math.round((done / shopR.length) * 100)}%` : '0%' }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {done}/{shopR.length}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Oxirgi 5 ta hal qilingan */}
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Oxirgi hal qilingan muammolar</h3>
              {historyItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Hali hal qilingan muammo mavjud emas
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Muhandis</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Nuqson</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Faktor</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Natija</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Bartaraf sanasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {historyItems.slice(0, 8).map((item) => {
                        const si = getStatusInfo(item.res.status)
                        return (
                          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                item.engineer === 'GA Engineer'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-warning/10 text-warning'
                              }`}>
                                {item.engineer}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-foreground">{item.rec.shop}</td>
                            <td className="px-3 py-2 text-sm text-foreground">{item.rec.codeName}</td>
                            <td className="px-3 py-2 text-center">
                              <Badge className={getFactorBadge(item.rec.factor)}>{item.rec.factor}</Badge>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge className={si.cls}>{si.label}</Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {new Date(item.res.resolvedAt).toLocaleString('uz-UZ')}
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

        {/* ── GA ENGINEER TAB ───────────────────────────────────────────── */}
        {activeTab === 'ga' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sehlar bo'yicha */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Sehlar bo'yicha holat</h3>
              <div className="space-y-4">
                {gaShops.map((shop) => {
                  const shopR   = gcaRecords.filter((r) => r.shop === shop)
                  const open    = shopR.filter((r) => !gaRes[r.id] || gaRes[r.id].status === 'ochiq').length
                  const done    = shopR.filter((r) => gaRes[r.id]?.status === 'yopilgan').length
                  const transf  = shopR.filter((r) => gaRes[r.id]?.status === 'uzatilgan').length
                  const total   = shopR.length
                  const pct     = total > 0 ? Math.round(((done + transf) / total) * 100) : 0
                  return (
                    <div key={shop}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{shop}</span>
                        <span className="text-muted-foreground">{done + transf}/{total} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="h-2 rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      {open > 0 && <p className="text-xs text-critical mt-0.5">{open} ta ochiq</p>}
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
                  { factor: 50, cls: 'bg-critical', text: 'text-critical' },
                  { factor: 20, cls: 'bg-warning',  text: 'text-warning'  },
                  { factor: 10, cls: 'bg-blue-500', text: 'text-blue-500' },
                  { factor: 5,  cls: 'bg-success',  text: 'text-success'  },
                ].map(({ factor, cls, text }) => {
                  const fRecs = gcaRecords.filter((r) => r.factor === factor)
                  const fDone = fRecs.filter((r) => gaRes[r.id]?.status === 'yopilgan' || gaRes[r.id]?.status === 'uzatilgan').length
                  const fOpen = fRecs.filter((r) => !gaRes[r.id] || gaRes[r.id].status === 'ochiq').length
                  return (
                    <div key={factor} className="flex items-center gap-4">
                      <div className={`w-2 h-8 rounded-full ${cls}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className={`font-semibold ${text}`}>Faktor {factor}</span>
                          <span className="text-muted-foreground">{fRecs.length} ta</span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="text-critical">{fOpen} ochiq</span>
                          <span className="text-success">{fDone} hal qilindi</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* GA resolved jadval */}
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-bold text-foreground mb-4">GA — Bartaraf etilgan nuqsonlar</h3>
              {Object.keys(gaRes).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Hali ma'lumot yo'q</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sektor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Nuqson</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Faktor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Ildiz sabab</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Natija</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Bartaraf sanasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(gaRes)
                        .filter(([, res]) => res.status === 'yopilgan' || res.status === 'uzatilgan')
                        .sort(([, a], [, b]) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime())
                        .map(([id, res]) => {
                          const rec = gcaRecords.find((r) => r.id === id)
                          if (!rec) return null
                          const si = getStatusInfo(res.status)
                          return (
                            <tr key={id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 text-muted-foreground text-xs">{rec.date}</td>
                              <td className="px-3 py-2 font-medium text-foreground">{rec.shop}</td>
                              <td className="px-3 py-2 text-xs">
                                {rec.sector ? (
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{rec.sector}</span>
                                ) : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-3 py-2 text-foreground">{rec.codeName}</td>
                              <td className="px-3 py-2 text-center">
                                <Badge className={getFactorBadge(rec.factor)}>{rec.factor}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px] truncate" title={res.rootCause}>
                                {res.rootCause || '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge className={si.cls}>{si.label}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
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

        {/* ── WELDING ENGINEER TAB ──────────────────────────────────────── */}
        {activeTab === 'welding' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sehlar bo'yicha */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Sehlar bo'yicha holat</h3>
              <div className="space-y-4">
                {wShops.map((shop) => {
                  const shopR  = weldingDRecs.filter((r) => r.shop === shop)
                  const open   = shopR.filter((r) => !weldingRes[r.id] || weldingRes[r.id].status === 'ochiq').length
                  const done   = shopR.filter((r) => weldingRes[r.id]?.status === 'yopilgan').length
                  const transf = shopR.filter((r) => weldingRes[r.id]?.status === 'uzatilgan').length
                  const total  = shopR.length
                  const pct    = total > 0 ? Math.round(((done + transf) / total) * 100) : 0
                  return (
                    <div key={shop}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{shop}</span>
                        <span className="text-muted-foreground">{done + transf}/{total} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="h-2 rounded-full bg-warning transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      {open > 0 && <p className="text-xs text-critical mt-0.5">{open} ta ochiq</p>}
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
                  { factor: 50, cls: 'bg-critical', text: 'text-critical' },
                  { factor: 20, cls: 'bg-warning',  text: 'text-warning'  },
                  { factor: 10, cls: 'bg-blue-500', text: 'text-blue-500' },
                  { factor: 5,  cls: 'bg-success',  text: 'text-success'  },
                ].map(({ factor, cls, text }) => {
                  const fRecs = weldingDRecs.filter((r) => r.factor === factor)
                  const fDone = fRecs.filter((r) => weldingRes[r.id]?.status === 'yopilgan' || weldingRes[r.id]?.status === 'uzatilgan').length
                  const fOpen = fRecs.filter((r) => !weldingRes[r.id] || weldingRes[r.id].status === 'ochiq').length
                  return (
                    <div key={factor} className="flex items-center gap-4">
                      <div className={`w-2 h-8 rounded-full ${cls}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className={`font-semibold ${text}`}>Faktor {factor}</span>
                          <span className="text-muted-foreground">{fRecs.length} ta</span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="text-critical">{fOpen} ochiq</span>
                          <span className="text-success">{fDone} hal qilindi</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Welding resolved jadval */}
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Welding — Bartaraf etilgan nuqsonlar</h3>
              {Object.keys(weldingRes).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Hali ma'lumot yo'q</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sektor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Nuqson</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Faktor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Ildiz sabab</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Natija</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Bartaraf sanasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(weldingRes)
                        .filter(([, res]) => res.status === 'yopilgan' || res.status === 'uzatilgan')
                        .sort(([, a], [, b]) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime())
                        .map(([id, res]) => {
                          const rec = dRecords.find((r) => r.id === id)
                          if (!rec) return null
                          const si = getStatusInfo(res.status)
                          return (
                            <tr key={id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-2 text-muted-foreground text-xs">{rec.date}</td>
                              <td className="px-3 py-2 font-medium text-foreground">{rec.shop}</td>
                              <td className="px-3 py-2 text-xs">
                                {rec.sector ? (
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{rec.sector}</span>
                                ) : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-3 py-2 text-foreground">{rec.codeName}</td>
                              <td className="px-3 py-2 text-center">
                                <Badge className={getFactorBadge(rec.factor)}>{rec.factor}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px] truncate" title={res.rootCause}>
                                {res.rootCause || '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge className={si.cls}>{si.label}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
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

        {/* ── TO'LIQ TARIX ──────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Barcha hal qilingan muammolar</h3>
              <span className="text-sm text-muted-foreground">{historyItems.length} ta</span>
            </div>
            {historyItems.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm">Hali hal qilingan muammo mavjud emas</p>
                <p className="text-muted-foreground text-xs mt-1">
                  GA yoki Welding muhandisi nuqsonlarni bartaraf etgach bu yerda ko'rinadi
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Muhandis</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sektor</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Nuqson</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Soni</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Faktor</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Muammo izohi</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Ildiz sabab</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tezkor chora</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Natija</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Bartaraf sanasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyItems.map((item) => {
                      const si = getStatusInfo(item.res.status)
                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              item.engineer === 'GA Engineer'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-warning/10 text-warning'
                            }`}>
                              {item.engineer}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">{item.rec.date}</td>
                          <td className="px-3 py-3 font-medium text-foreground">{item.rec.shop}</td>
                          <td className="px-3 py-3 text-xs">
                            {item.rec.sector ? (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">{item.rec.sector}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3 text-foreground max-w-[120px] truncate" title={item.rec.codeName}>
                            {item.rec.codeName}
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-semibold text-foreground">{item.rec.count}</td>
                          <td className="px-3 py-3 text-center">
                            <Badge className={getFactorBadge(item.rec.factor)}>{item.rec.factor}</Badge>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground max-w-[140px] truncate" title={item.res.problemDescription}>
                            {item.res.problemDescription || '—'}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground max-w-[140px] truncate" title={item.res.rootCause}>
                            {item.res.rootCause || '—'}
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground max-w-[140px] truncate" title={item.res.immediateAction}>
                            {item.res.immediateAction || '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Badge className={si.cls}>{si.label}</Badge>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(item.res.resolvedAt).toLocaleString('uz-UZ')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

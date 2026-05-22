'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Bell,
  RefreshCw,
  CheckCheck,
  Loader2,
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

interface EscalationRow {
  id:            string
  import_batch:  string | null
  fault_code:    string
  fault_name:    string
  shop:          string
  prod_team:     string | null
  total_count:   number
  drl_ratio:     number | null
  model_damas:   number
  model_labo:    number
  assigned_role: string
  assigned_name: string | null
  priority:      string
  status:        string
  engineer_note: string | null
  root_cause:    string | null
  action_taken:  string | null
  created_at:    string
  resolved_at:   string | null
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

const ESC_STATUS: Record<string, { label: string; cls: string }> = {
  open:        { label: '🔴 Ochiq',      cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  in_progress: { label: '🟡 Jarayonda',  cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  resolved:    { label: '✅ Yopildi',    cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  cancelled:   { label: '⛔ Bekor',      cls: 'bg-muted/20 text-muted-foreground border border-border' },
}

const ESC_PRIORITY: Record<string, { label: string; cls: string }> = {
  critical: { label: '🔴 Kritik',   cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  high:     { label: '🟠 Yuqori',   cls: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
  medium:   { label: '🟡 O\'rtacha',cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  low:      { label: '🔵 Past',     cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
}

const SHOP_CLS: Record<string, string> = {
  'WELDING':    'bg-sky-600 text-white',
  'PAINT SHOP': 'bg-violet-600 text-white',
  'GA':         'bg-emerald-600 text-white',
  'PRESS SHOP': 'bg-amber-600 text-white',
}

const ROLE_LABEL: Record<string, string> = {
  ga_engineer:      'GA Muhandis',
  welding_engineer: 'Welding Muhandis',
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

  // ── DRL Eskalatsiyalar (DB) ────────────────────────────────────────────────
  const [escalations, setEscalations] = useState<EscalationRow[]>([])
  const [escLoading,  setEscLoading]  = useState(false)
  const [escFilter,   setEscFilter]   = useState<'all' | 'ga_engineer' | 'welding_engineer'>('all')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [refreshing,  setRefreshing]  = useState(false)

  const loadEscalations = useCallback(async (silent = false) => {
    if (!silent) setEscLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch('/api/drl-escalations')
      if (res.ok) {
        const data = await res.json()
        setEscalations(Array.isArray(data) ? data : [])
        setLastRefresh(new Date())
      }
    } catch {}
    finally {
      setEscLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadEscalations() }, [loadEscalations])

  // 30 soniyada bir marta avtomatik yangilash
  useEffect(() => {
    const id = setInterval(() => loadEscalations(true), 30_000)
    return () => clearInterval(id)
  }, [loadEscalations])

  const [activeTab, setActiveTab] = useState<'overview' | 'ga' | 'welding' | 'drl' | 'history'>('overview')

  // ── Eskalatsiya statistikasi ───────────────────────────────────────────────
  const escStats = useMemo(() => {
    const all     = escalations
    const open    = all.filter(e => e.status === 'open').length
    const inProg  = all.filter(e => e.status === 'in_progress').length
    const resolved= all.filter(e => e.status === 'resolved').length
    const gaOpen  = all.filter(e => e.assigned_role === 'ga_engineer'      && e.status === 'open').length
    const wOpen   = all.filter(e => e.assigned_role === 'welding_engineer'  && e.status === 'open').length
    const critical= all.filter(e => e.priority === 'critical' && e.status !== 'resolved' && e.status !== 'cancelled').length
    return { total: all.length, open, inProg, resolved, gaOpen, wOpen, critical }
  }, [escalations])

  const filteredEsc = useMemo(() => {
    if (escFilter === 'all') return escalations
    return escalations.filter(e => e.assigned_role === escFilter)
  }, [escalations, escFilter])

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

        {/* ── Tepki qator ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/dashboard/manager">
            <button className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Rahbar paneliga qaytish
            </button>
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            {escStats.open > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold animate-pulse">
                <Bell className="w-3.5 h-3.5" />
                {escStats.open} ochiq eskalatsiya
              </span>
            )}
            <span suppressHydrationWarning className="text-xs text-muted-foreground hidden sm:block">
              {lastRefresh.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <button
              onClick={() => loadEscalations(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
          </div>
        </div>

        {/* ── UMUMIY KPI ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
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
            sub="Boshqa sehga"
          />
          <KpiCard
            label="Jarayonda"
            value={gaStats.inProgress + wStats.inProgress}
            cls="text-warning"
            border="border-warning/40"
          />
          <KpiCard
            label="Hal qilinmagan"
            value={gaStats.open + wStats.open}
            cls="text-critical"
            border="border-critical/40"
          />
          <KpiCard
            label="Faktor 50 (xavfli)"
            value={gaStats.f50 + wStats.f50}
            cls="text-critical"
            border="border-critical/40"
            sub={`${gaStats.f50resolved + wStats.f50resolved} ta bartaraf`}
          />
          {/* DRL Eskalatsiyalar */}
          <div
            className={`bg-card border-2 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
              escStats.open > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-emerald-500/40'
            }`}
            onClick={() => setActiveTab('drl')}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Bell className={`w-3.5 h-3.5 ${escStats.open > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
              <p className="text-xs text-muted-foreground">DRL Esc.</p>
            </div>
            <p className={`text-2xl font-bold ${escStats.open > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {escStats.open}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {escStats.inProg > 0 ? `${escStats.inProg} jarayonda` : `${escStats.resolved} yopildi`}
            </p>
          </div>
        </div>

        {/* ── TAB BAR ───────────────────────────────────────────────────── */}
        <div className="inline-flex bg-card border border-border rounded-lg p-1 gap-1 flex-wrap">
          {(([
            { key: 'overview', label: "Umumiy ko'rinish", icon: Activity       as React.FC<{className?:string}> },
            { key: 'ga',       label: 'GA Engineer',      icon: TrendingUp     as React.FC<{className?:string}> },
            { key: 'welding',  label: 'Welding Engineer', icon: BarChart2      as React.FC<{className?:string}> },
            { key: 'drl',      label: 'DRL Eskalatsiyalar', icon: Bell         as React.FC<{className?:string}>,
              badge: escStats.open > 0 ? escStats.open : undefined },
            { key: 'history',  label: 'Tarix',            icon: ClipboardList  as React.FC<{className?:string}> },
          ]) as { key: typeof activeTab; label: string; icon: React.FC<{className?:string}>; badge?: number }[]).map(({ key, label, icon: Ic, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Ic className="w-4 h-4" />
              {label}
              {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sehlar bo&apos;yicha</p>
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sehlar bo&apos;yicha</p>
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

            {/* DRL Eskalatsiyalar umumiy karta */}
            <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-red-400" />
                  <h3 className="text-base font-bold text-foreground">DRL Eskalatsiyalar (GSIP)</h3>
                  {escStats.open > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                      {escStats.open} yangi
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('drl')}
                  className="text-xs text-primary hover:underline"
                >
                  Barchasini ko&apos;rish →
                </button>
              </div>
              {escLoading ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Yuklanmoqda...
                </div>
              ) : escalations.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                  <CheckCheck className="w-4 h-4 text-success" />
                  Hozircha eskalatsiyalar yo&apos;q
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami',       value: escStats.total,    cls: 'text-foreground', bg: 'bg-muted/30' },
                    { label: 'Ochiq',      value: escStats.open,     cls: 'text-red-400',    bg: 'bg-red-500/10' },
                    { label: 'Jarayonda',  value: escStats.inProg,   cls: 'text-amber-400',  bg: 'bg-amber-500/10' },
                    { label: 'Yopildi',    value: escStats.resolved, cls: 'text-emerald-400',bg: 'bg-emerald-500/10' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
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
              <h3 className="text-base font-bold text-foreground mb-4">Sehlar bo&apos;yicha holat</h3>
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
              <h3 className="text-base font-bold text-foreground mb-4">Faktor bo&apos;yicha holat</h3>
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
                <p className="text-sm text-muted-foreground py-4 text-center">Hali ma&apos;lumot yo&apos;q</p>
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
              <h3 className="text-base font-bold text-foreground mb-4">Sehlar bo&apos;yicha holat</h3>
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
              <h3 className="text-base font-bold text-foreground mb-4">Faktor bo&apos;yicha holat</h3>
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
                <p className="text-sm text-muted-foreground py-4 text-center">Hali ma&apos;lumot yo&apos;q</p>
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

        {/* ── DRL ESKALATSIYALAR TAB ────────────────────────────────────── */}
        {activeTab === 'drl' && (
          <div className="space-y-5">

            {/* KPI satri */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Jami',          value: escStats.total,    cls: 'text-foreground',   bg: 'bg-card border-border' },
                { label: 'Ochiq',         value: escStats.open,     cls: 'text-red-400',      bg: 'bg-card border-red-500/30' },
                { label: 'Jarayonda',     value: escStats.inProg,   cls: 'text-amber-400',    bg: 'bg-card border-amber-500/30' },
                { label: 'Yopildi',       value: escStats.resolved, cls: 'text-emerald-400',  bg: 'bg-card border-emerald-500/30' },
                { label: 'GA Ochiq',      value: escStats.gaOpen,   cls: 'text-primary',      bg: 'bg-card border-primary/30' },
                { label: 'Welding Ochiq', value: escStats.wOpen,    cls: 'text-warning',      bg: 'bg-card border-warning/30' },
              ].map(s => (
                <div key={s.label} className={`border-2 ${s.bg} rounded-xl p-4`}>
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Filter tugmalari */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Filtr:</span>
              {([
                { key: 'all',              label: 'Hammasi'         },
                { key: 'ga_engineer',      label: 'GA Muhandis'     },
                { key: 'welding_engineer', label: 'Welding Muhandis'},
              ] as { key: typeof escFilter; label: string }[]).map(f => (
                <button key={f.key} onClick={() => setEscFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    escFilter === f.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                  {f.key === 'all'              && <span className="ml-1.5 opacity-70">({escStats.total})</span>}
                  {f.key === 'ga_engineer'      && <span className="ml-1.5 opacity-70">({escalations.filter(e=>e.assigned_role==='ga_engineer').length})</span>}
                  {f.key === 'welding_engineer' && <span className="ml-1.5 opacity-70">({escalations.filter(e=>e.assigned_role==='welding_engineer').length})</span>}
                </button>
              ))}
              <button onClick={() => loadEscalations(true)} disabled={refreshing}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Yangilash
              </button>
            </div>

            {/* Jadval */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {escLoading ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Yuklanmoqda...</span>
                </div>
              ) : filteredEsc.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CheckCheck className="w-10 h-10 text-emerald-400 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {escFilter === 'all' ? 'Hozircha eskalatsiyalar yo\'q' : `${ROLE_LABEL[escFilter]} uchun eskalatsiya topilmadi`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/10">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Soni</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Muhandis</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Ustuvorlik</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Holat</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ildiz sabab</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Ko'rilgan chora</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredEsc.map((e, i) => (
                        <tr key={e.id}
                          className={`transition-colors hover:bg-muted/15 ${
                            e.status === 'open' ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {e.fault_code !== '—' && (
                                <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                                  {e.fault_code}
                                </span>
                              )}
                              <span className="text-sm font-medium text-foreground">{e.fault_name}</span>
                            </div>
                            {(e.model_damas > 0 || e.model_labo > 0) && (
                              <div className="flex gap-2 mt-0.5">
                                {e.model_damas > 0 && <span className="text-xs text-sky-400">D:{e.model_damas}</span>}
                                {e.model_labo  > 0 && <span className="text-xs text-emerald-400">L:{e.model_labo}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SHOP_CLS[e.shop] ?? 'bg-muted/30 text-muted-foreground'}`}>
                              {e.shop}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-base font-bold text-foreground">
                            {e.total_count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                              e.assigned_role === 'ga_engineer'
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {ROLE_LABEL[e.assigned_role] ?? e.assigned_role}
                            </span>
                            {e.assigned_name && (
                              <p className="text-xs text-muted-foreground mt-0.5">{e.assigned_name}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              ESC_PRIORITY[e.priority]?.cls ?? 'bg-muted/20 text-muted-foreground border border-border'
                            }`}>
                              {ESC_PRIORITY[e.priority]?.label ?? e.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              ESC_STATUS[e.status]?.cls ?? 'bg-muted/20 text-muted-foreground'
                            }`}>
                              {ESC_STATUS[e.status]?.label ?? e.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[150px]">
                            <p className="text-xs text-foreground truncate" title={e.root_cause ?? ''}>
                              {e.root_cause || <span className="text-muted-foreground/50 italic">Kiritilmagan</span>}
                            </p>
                          </td>
                          <td className="px-4 py-3 max-w-[150px]">
                            <p className="text-xs text-foreground truncate" title={e.action_taken ?? ''}>
                              {e.action_taken || <span className="text-muted-foreground/50 italic">Kiritilmagan</span>}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(e.created_at).toLocaleDateString('uz-UZ')}
                            {e.resolved_at && (
                              <p className="text-emerald-400">
                                ✅ {new Date(e.resolved_at).toLocaleDateString('uz-UZ')}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* DRL Dashboard havola */}
            <div className="flex items-center justify-center gap-3">
              <Link href="/dashboard/drl">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-xl text-sm font-semibold hover:bg-yellow-500/20 transition-all">
                  <TrendingUp className="w-4 h-4" />
                  To'liq DRL Dashboard →
                </button>
              </Link>
              <Link href="/dashboard/drl-admin">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-muted-foreground rounded-xl text-sm font-medium hover:text-foreground hover:border-primary/40 transition-all">
                  GSIP Excel yuklash →
                </button>
              </Link>
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
                  GA yoki Welding muhandisi nuqsonlarni bartaraf etgach bu yerda ko&apos;rinadi
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

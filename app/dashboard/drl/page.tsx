'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/page-header'
import {
  ChevronLeft, TrendingDown, AlertTriangle, RefreshCw,
  Car, Layers, Building2, FileSpreadsheet, Bell,
  X, Search, Calendar, BookOpen, Upload, CheckCircle2, ChevronRight,
} from 'lucide-react'
import type { ShiftCalendar } from '@/lib/gsip-drr-parser'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  batchId:   string
  totals:    { row_count: number; total_count: number; damas_count: number; labo_count: number; date_from: string; date_to: string; shift_from: string; shift_to: string; file_name: string }
  byShop:    { shop: string; total: number }[]
  byModel:   { model_label: string; total: number }[]
  byPartLv1: { part_lv1: string; total: number }[]
  top10:     Top10Fault[]
}

interface Top10Fault {
  rank:          number
  fault_code:    string
  fault_name:    string
  total_count:   number
  total_veh_cnt: number
  drl_ratio_sum: number
  model_damas:   number
  model_labo:    number
  top_prod_team: string
  top_shop:      string
  top_part_lv1:  string
}

interface EscalationModal {
  fault:         Top10Fault
  assignedRole:  string
  assignedName:  string
  priority:      string
  note:          string
}

// ── Drilldown types ────────────────────────────────────────────────────────────
interface DrillRow {
  part_lv2:        string
  part_lv3:        string
  part_lv4:        string
  fault_code:      string
  fault_name:      string
  shop:            string
  prod_team:       string
  model_group:     string
  total_count:     number
  total_veh:       number
  total_drl_ratio: number
  model_damas:     number
  model_labo:      number
}
interface DrillTotals { total_count: number; total_veh: number; total_drl_ratio: number }
interface DrillData   { lv1: string; totals: DrillTotals; rows: DrillRow[] }

interface Batch {
  import_batch: string
  date_from:    string
  shift_from:   string
  shift_to:     string
  total_count:  number
  shift_label:  string | null
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
type FilterMode = 'batch' | 'kunlik' | 'oylik' | 'yillik'

function getDateRange(mode: FilterMode, selDate: string, selMonth: string, selYear: string) {
  if (mode === 'kunlik') return { from: selDate, to: selDate }
  if (mode === 'oylik') {
    const [y, m] = selMonth.split('-').map(Number)
    const last   = new Date(y, m, 0).getDate()
    return { from: `${selMonth}-01`, to: `${selMonth}-${String(last).padStart(2, '0')}` }
  }
  if (mode === 'yillik') return { from: `${selYear}-01-01`, to: `${selYear}-12-31` }
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SHOP_COLORS: Record<string, string> = {
  'WELDING':    'bg-sky-600 text-white border-sky-500',
  'PAINT SHOP': 'bg-violet-600 text-white border-violet-500',
  'GA':         'bg-emerald-600 text-white border-emerald-500',
  'PRESS SHOP': 'bg-amber-600 text-white border-amber-500',
}

const SHOP_DOT: Record<string, string> = {
  'WELDING':    'bg-sky-400',
  'PAINT SHOP': 'bg-violet-400',
  'GA':         'bg-emerald-400',
  'PRESS SHOP': 'bg-amber-400',
}

// Hex colors for Recharts PieChart cells
const SHOP_HEX: Record<string, string> = {
  'WELDING':    '#0284c7',
  'PAINT SHOP': '#7c3aed',
  'GA':         '#059669',
  'PRESS SHOP': '#d97706',
}

function rankColor(rank: number) {
  if (rank === 1) return 'bg-red-600'
  if (rank === 2) return 'bg-red-500'
  if (rank === 3) return 'bg-orange-500'
  if (rank <= 6)  return 'bg-amber-500'
  return 'bg-blue-500'
}

function shiftLabel(s: string) {
  if (s === 'E') return 'Erta'
  if (s === 'N') return 'Tun'
  if (s === 'L') return 'Kech'
  return s
}

const MONTHS_UZ_FULL = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr']
function formatDateRange(from: string, to: string): string {
  if (!from || !to) return ''
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const mf = MONTHS_UZ_FULL[fm - 1]
  const mt = MONTHS_UZ_FULL[tm - 1]
  if (from === to) return `${fd}-${mf} ${fy}`
  if (fm === tm && fy === ty) return `${fd}–${td} ${mf} ${fy}`
  if (fy === ty) return `${fd}-${mf} – ${td}-${mt} ${fy}`
  return `${fd}-${mf} ${fy} – ${td}-${mt} ${ty}`
}

function teamToRole(team: string) {
  const t = team.toUpperCase()
  if (t.startsWith('00.BO')) return 'welding_engineer'
  if (t.startsWith('00.PR')) return 'ga_engineer'
  return 'ga_engineer'
}

// ─── Main Component ────────────────────────────────────────────────────────────
function DRLPageContent() {
  const searchParams = useSearchParams()
  const batchParam   = searchParams.get('batch')

  const [stats,    setStats]    = useState<Stats | null>(null)
  const [batches,  setBatches]  = useState<Batch[]>([])
  const [selBatch, setSelBatch] = useState<string>(batchParam ?? '')
  const [loading,  setLoading]  = useState(true)
  const [empty,    setEmpty]    = useState(false)
  const [detailShop, setDetailShop] = useState<string | null>(null)
  const [detailRows, setDetailRows] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [session,  setSession]  = useState<{ role: string; name: string } | null>(null)

  // Oylik hisobot modal
  const [monthlyOpen, setMonthlyOpen] = useState(false)

  // Smena tabs
  type SmenaTab = 'all' | 'A' | 'B' | 'D'
  const [selSmena, setSelSmena] = useState<SmenaTab>('all')

  // Date filter
  const todayStr   = new Date().toISOString().split('T')[0]
  const monthStr   = todayStr.substring(0, 7)
  const yearStr    = todayStr.substring(0, 4)
  const [filterMode, setFilterMode] = useState<FilterMode>('batch')
  const [selDate,    setSelDate]    = useState(todayStr)
  const [selMonth,   setSelMonth]   = useState(monthStr)
  const [selYear,    setSelYear]    = useState(yearStr)

  // Escalation modal
  const [escModal, setEscModal] = useState<EscalationModal | null>(null)
  const [escSaving, setEscSaving] = useState(false)
  const [escDone,   setEscDone]   = useState<Set<string>>(new Set())

  // Drilldown drawer
  const [drill,        setDrill]        = useState<DrillData | null>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [drillSearch,  setDrillSearch]  = useState('')

  const openDrill = async (lv1: string) => {
    setDrillLoading(true)
    setDrill(null)
    setDrillSearch('')
    try {
      let url: string
      if (stats?.batchId) {
        // Batch mode — use batch UUID
        url = `/api/drl-import/drilldown?batch=${stats.batchId}&lv1=${encodeURIComponent(lv1)}`
      } else {
        // Date mode — use from/to + optional shift
        const range = filterMode === 'batch'
          ? null
          : getDateRange(filterMode, selDate, selMonth, selYear)
        if (!range) { setDrillLoading(false); return }
        const params = new URLSearchParams({ from: range.from, to: range.to, lv1 })
        if (selSmena !== 'all') params.set('shift', selSmena)
        url = `/api/drl-import/drilldown?${params}`
      }
      const res  = await fetch(url)
      const data = await res.json()
      setDrill(data)
    } finally {
      setDrillLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])

  // Load batch list
  useEffect(() => {
    fetch('/api/drl-import')
      .then(r => r.ok ? r.json() : [])
      .then((data: Batch[]) => {
        setBatches(data)
        if (!batchParam && data.length > 0) setSelBatch(data[0].import_batch)
      })
  }, [batchParam])

  // Load stats
  const loadStats = useCallback(async (params: { batch?: string; from?: string; to?: string; shift?: string }) => {
    setLoading(true)
    setEmpty(false)
    let url = '/api/drl-import/stats'
    if (params.batch) {
      url = `/api/drl-import/stats?batch=${params.batch}`
    } else if (params.from && params.to) {
      url = `/api/drl-import/stats?from=${params.from}&to=${params.to}`
      if (params.shift) url += `&shift=${params.shift}`
    } else if (params.shift) {
      // batch mode with shift filter — get latest batch of that shift
      url = `/api/drl-import/stats?shift=${params.shift}`
    }
    try {
      const res  = await fetch(url)
      const data = await res.json()
      if (data.empty || !data.totals) {
        setEmpty(true)
        setStats(null)
      } else {
        setStats(data)
      }
    } catch {
      setEmpty(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Batch mode
  useEffect(() => {
    if (filterMode !== 'batch') return
    if (selSmena !== 'all') {
      loadStats({ shift: selSmena })
    } else if (selBatch) {
      loadStats({ batch: selBatch })
    } else if (batches.length === 0 && !loading) {
      setEmpty(true)
    }
  }, [filterMode, selBatch, selSmena, loadStats])

  // Date mode
  useEffect(() => {
    if (filterMode === 'batch') return
    const range = getDateRange(filterMode, selDate, selMonth, selYear)
    if (!range) return
    loadStats({ from: range.from, to: range.to, shift: selSmena !== 'all' ? selSmena : undefined })
  }, [filterMode, selDate, selMonth, selYear, selSmena, loadStats])

  // Load shop detail rows
  const openShopDetail = async (shop: string) => {
    setDetailShop(shop)
    setDetailLoading(true)
    try {
      const batchQ = stats?.batchId ? `&batch=${stats.batchId}` : ''
      // We'll use the top10 data filtered by shop for now, full table would need extra API
      const filtered = stats?.top10.filter(f => f.top_shop === shop) ?? []
      setDetailRows(filtered)
    } finally {
      setDetailLoading(false)
    }
  }

  // Escalation submit
  const submitEscalation = async () => {
    if (!escModal) return
    setEscSaving(true)
    try {
      const res = await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source:       'drl',
          importBatch:  stats?.batchId,
          faultCode:    escModal.fault.fault_code,
          faultName:    escModal.fault.fault_name,
          shop:         escModal.fault.top_shop,
          prodTeam:     escModal.fault.top_prod_team,
          totalCount:   escModal.fault.total_count,
          drlRatio:     escModal.fault.drl_ratio_sum,
          modelDamas:   escModal.fault.model_damas,
          modelLabo:    escModal.fault.model_labo,
          assignedRole: escModal.assignedRole,
          priority:     escModal.priority,
          note:         escModal.note,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setEscDone(prev => new Set(prev).add(escModal.fault.fault_code))
      setEscModal(null)
    } finally {
      setEscSaving(false)
    }
  }

  const isAdmin = session && ['superadmin', 'admin'].includes(session.role)

  // ── Shop detail view ───────────────────────────────────────────────────────
  if (detailShop) {
    const shopStat = stats?.byShop.find(s => s.shop === detailShop)
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title={detailShop}
          description="DRL nuqsonlari tafsiloti"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'DRL', href: '/dashboard/drl' },
            { label: detailShop },
          ]}
        />
        <div className="p-6 space-y-5">
          <button onClick={() => setDetailShop(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> Orqaga
          </button>

          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-1">{detailShop} — Jami nuqsonlar</p>
            <p className="text-4xl font-bold text-foreground">{shopStat?.total.toLocaleString() ?? 0}</p>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bu sehga tegishli Top nuqsonlar
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {['#', 'Kod', 'Nuqson', 'Soni', 'DAMAS', 'LABO'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.top10 ?? []).filter(f => f.top_shop === detailShop).map((f, i) => (
                  <tr key={f.fault_code} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${rankColor(i+1)}`}>
                        {i+1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-primary">{f.fault_code}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{f.fault_name}</td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{f.total_count}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{f.model_damas}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{f.model_labo}</td>
                  </tr>
                ))}
                {(stats?.top10 ?? []).filter(f => f.top_shop === detailShop).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Bu sehga tegishli top nuqsonlar topilmadi
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {monthlyOpen && <DRLMonthlyModal onClose={() => setMonthlyOpen(false)} />}
      <PageHeader
        title="DRL Dashboard"
        description="Direct Run Loss — GSIP import ma'lumotlari tahlili"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'DRL Dashboard' },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Orqaga
            </button>
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Smena chips — GCA style */}
            <div className="flex items-center bg-muted/40 border border-border rounded-lg p-0.5 gap-0.5">
              {([
                { key: 'A', label: 'A smena' },
                { key: 'B', label: 'B smena' },
                { key: 'D', label: 'D smena' },
              ] as { key: SmenaTab; label: string }[]).map(s => {
                const cnt = batches.filter(b => b.shift_label === s.key).length
                return (
                  <button key={s.key}
                    onClick={() => { setSelSmena(s.key) }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      selSmena === s.key
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    {s.label}
                    {cnt > 0 && (
                      <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded-full ${
                        selSmena === s.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                      }`}>{cnt}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Yangilash */}
            <button onClick={() => {
              const shiftArg = selSmena !== 'all' ? selSmena : undefined
              if (filterMode === 'batch') {
                if (selSmena !== 'all') loadStats({ shift: selSmena })
                else loadStats({ batch: selBatch })
              } else {
                const range = getDateRange(filterMode, selDate, selMonth, selYear)
                if (range) loadStats({ ...range, shift: shiftArg })
              }
            }}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
            </button>

            {session?.role === 'superadmin' && (
              <button onClick={() => setMonthlyOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all">
                <BookOpen className="w-3.5 h-3.5" /> Oylik Hisobot
              </button>
            )}
            {isAdmin && (
              <Link href="/dashboard/drl-admin">
                <button className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-all">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Yangi Import
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* ── Time filter — faqat smena tanlanganda ── */}
        {selSmena !== 'all' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-muted/40 border border-border rounded-xl p-1 gap-1">
              {([
                { key: 'batch',  label: 'Hammasi' },
                { key: 'kunlik', label: 'Kunlik'  },
                { key: 'oylik',  label: 'Oylik'   },
                { key: 'yillik', label: 'Yillik'  },
              ] as { key: FilterMode; label: string }[]).map(m => (
                <button key={m.key}
                  onClick={() => setFilterMode(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterMode === m.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
            {filterMode === 'kunlik' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none" />
              </div>
            )}
            {filterMode === 'oylik' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none" />
              </div>
            )}
            {filterMode === 'yillik' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <select value={selYear} onChange={e => setSelYear(e.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none">
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── Date info badge ── */}
        {stats && !loading && selSmena !== 'all' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border rounded-lg w-fit text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
            <span className="font-semibold text-foreground">{selSmena} Smena</span>
            <span className="text-border">•</span>
            <span>{formatDateRange(stats.totals.date_from, stats.totals.date_to)}</span>
          </div>
        )}

        {/* Empty state */}
        {empty && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <FileSpreadsheet className="w-14 h-14 text-muted-foreground" />
            <p className="text-foreground font-semibold">Hali GSIP import qilinmagan</p>
            <p className="text-sm text-muted-foreground">
              DRL ma&apos;lumotlarini ko&apos;rish uchun Excel faylni yuklang
            </p>
            {isAdmin && (
              <Link href="/dashboard/drl-admin">
                <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
                  Excel yuklash →
                </button>
              </Link>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {stats && !loading && (
          <>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Jami nuqsonlar',    value: stats.totals.total_count,  icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
                { label: 'DAMAS (R7)',         value: stats.totals.damas_count,  icon: <Car className="w-5 h-5" />,          color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
                { label: 'LABO (R7A)',         value: stats.totals.labo_count,   icon: <Car className="w-5 h-5" />,          color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} className={`rounded-xl border p-5 ${bg}`}>
                  <div className={`mb-2 ${color}`}>{icon}</div>
                  <p className="text-2xl font-bold text-foreground">{value?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Shop distribution — Pie Chart */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Sexlar bo&apos;yicha taqsimot
              </h2>

              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex flex-col md:flex-row items-center gap-6">

                  {/* Pie chart */}
                  <div className="w-full md:w-[280px] h-[260px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.byShop}
                          dataKey="total"
                          nameKey="shop"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={110}
                          paddingAngle={3}
                          onClick={(entry) => openShopDetail(entry.shop)}
                          style={{ cursor: 'pointer' }}
                        >
                          {stats.byShop.map(s => (
                            <Cell
                              key={s.shop}
                              fill={SHOP_HEX[s.shop] ?? '#6b7280'}
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString(), 'Nuqsonlar']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '10px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '13px',
                          }}
                        />
                        {/* Centre label */}
                        <text
                          x="50%" y="46%"
                          textAnchor="middle" dominantBaseline="middle"
                          className="fill-foreground"
                          style={{ fill: 'hsl(var(--foreground))', fontSize: 22, fontWeight: 700 }}
                        >
                          {stats.totals.total_count.toLocaleString()}
                        </text>
                        <text
                          x="50%" y="58%"
                          textAnchor="middle" dominantBaseline="middle"
                          style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        >
                          jami nuqson
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend — clickable shop cards */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {stats.byShop.map(s => {
                      const pct = stats.totals.total_count > 0
                        ? ((s.total / stats.totals.total_count) * 100).toFixed(1)
                        : '0'
                      const hex = SHOP_HEX[s.shop] ?? '#6b7280'
                      return (
                        <button
                          key={s.shop}
                          onClick={() => openShopDetail(s.shop)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all text-left group"
                        >
                          {/* Color swatch */}
                          <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: hex }} />

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                              {s.shop}
                            </p>
                            <p className="text-xl font-bold text-foreground leading-tight">
                              {s.total.toLocaleString()}
                            </p>
                            {/* mini progress bar */}
                            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: hex }}
                              />
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold" style={{ color: hex }}>{pct}%</p>
                            <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">tafsilot →</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Top 10 Pareto */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  Top 10 Ko&apos;p Takrorlangan Nuqsonlar
                </h2>
                <p className="text-xs text-muted-foreground">
                  {escDone.size > 0 && `${escDone.size} ta eskalatsiya yaratildi`}
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sexi</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Soni</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">DAMAS</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">LABO</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Qism</th>
                        {isAdmin && <th className="px-4 py-3 w-24"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.top10.map((f) => {
                        const maxCount  = stats.top10[0]?.total_count ?? 1
                        const barWidth  = Math.round((f.total_count / maxCount) * 100)
                        const shopCls   = SHOP_COLORS[f.top_shop] ?? 'bg-muted/20 text-muted-foreground border-border'
                        const isDone    = escDone.has(f.fault_code)
                        return (
                          <tr key={f.fault_code}
                            className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${rankColor(f.rank)}`}>
                                {f.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-[220px]">
                              <div className="flex items-start gap-2">
                                <div className="min-w-0">
                                  {f.fault_code !== '—' && (
                                    <span className="text-xs font-mono text-primary mr-1">{f.fault_code}</span>
                                  )}
                                  <span className="text-sm text-foreground">{f.fault_name}</span>
                                </div>
                              </div>
                              {/* Bar */}
                              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden w-full max-w-[160px]">
                                <div className={`h-full rounded-full ${rankColor(f.rank)} opacity-70`}
                                  style={{ width: `${barWidth}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${shopCls}`}>
                                {f.top_shop}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                              {f.total_count.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-foreground">{f.model_damas}</td>
                            <td className="px-4 py-3 text-right text-sm text-foreground">{f.model_labo}</td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground max-w-[100px] truncate">
                              {f.top_part_lv1}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-right">
                                {isDone ? (
                                  <span className="text-xs text-success font-medium">✓ Yuborildi</span>
                                ) : (
                                  <button
                                    onClick={() => setEscModal({
                                      fault:        f,
                                      assignedRole: teamToRole(f.top_prod_team ?? ''),
                                      assignedName: '',
                                      priority:     f.total_count >= 100 ? 'critical' : f.total_count >= 40 ? 'high' : 'medium',
                                      note:         '',
                                    })}
                                    className="flex items-center gap-1 px-2 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors"
                                  >
                                    <Bell className="w-3 h-3" /> Eskalatsiya
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Part Level 1 breakdown */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Qism kategoriyalari bo&apos;yicha
                <span className="text-xs font-normal text-muted-foreground ml-1">— batafsil ko&apos;rish uchun bosing</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.byPartLv1.slice(0, 10).map(p => {
                  const pct = stats.totals.total_count > 0
                    ? Math.round((p.total / stats.totals.total_count) * 100)
                    : 0
                  return (
                    <button key={p.part_lv1} onClick={() => openDrill(p.part_lv1)}
                      className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer">
                      <p className="text-xs text-muted-foreground truncate mb-1 group-hover:text-primary transition-colors">{p.part_lv1}</p>
                      <p className="text-xl font-bold text-foreground">{p.total.toLocaleString()}</p>
                      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">tafsilot →</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Drilldown Drawer ──────────────────────────────────────────────── */}
      {(drill || drillLoading) && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setDrill(null)} />

          {/* Drawer — full height, wide panel */}
          <div className="w-full max-w-3xl bg-card border-l border-border flex flex-col h-full shadow-2xl">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground text-base truncate">{drill?.lv1 ?? '...'}</h3>
                  {drill && (
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        Jami: <strong className="text-foreground">{drill.totals.total_count}</strong> ta nuqson
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setDrill(null)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors shrink-0 ml-3">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* ── Search ── */}
            {drill && (
              <div className="px-6 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={drillSearch}
                    onChange={e => setDrillSearch(e.target.value)}
                    placeholder="Qidirish: nuqson nomi, kodi, joylashuv..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  {drillSearch && (
                    <button onClick={() => setDrillSearch('')} className="shrink-0">
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Column headers ── */}
            {drill && (
              <div className="grid grid-cols-[1fr_1.8fr_auto_auto] gap-x-3 px-6 py-2.5 border-b border-border bg-muted/20 shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joylashuv</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nuqson</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Sexi</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Soni</span>
              </div>
            )}

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">
              {drillLoading && (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-7 h-7 animate-spin text-primary" />
                </div>
              )}

              {drill && (() => {
                const search = drillSearch.toLowerCase()
                const filtered = search
                  ? drill.rows.filter(r =>
                      r.fault_name.toLowerCase().includes(search) ||
                      r.fault_code.toLowerCase().includes(search) ||
                      r.part_lv2.toLowerCase().includes(search) ||
                      r.part_lv3.toLowerCase().includes(search) ||
                      r.part_lv4.toLowerCase().includes(search)
                    )
                  : drill.rows

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-16 text-sm text-muted-foreground">
                      Hech narsa topilmadi
                    </div>
                  )
                }

                // Group by lv2 — flat rows inside
                const byLv2: Record<string, DrillRow[]> = {}
                for (const row of filtered) {
                  const lv2 = row.part_lv2 || '—'
                  if (!byLv2[lv2]) byLv2[lv2] = []
                  byLv2[lv2].push(row)
                }

                return (
                  <div className="divide-y divide-border">
                    {Object.entries(byLv2).map(([lv2, rows]) => {
                      const secTotal = rows.reduce((s, r) => s + Number(r.total_count), 0)
                      const secDrl   = rows.reduce((s, r) => s + Number(r.total_drl_ratio), 0)
                      return (
                        <div key={lv2}>
                          {/* Lv2 section header — sticky */}
                          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-2.5 bg-muted/60 backdrop-blur-sm border-b border-border">
                            <span className="text-sm font-bold text-foreground">{lv2}</span>
                            <span className="text-xs text-muted-foreground">{secTotal} nuqson</span>
                          </div>

                          {/* Flat rows */}
                          <div className="divide-y divide-border/50">
                            {rows.map((row, idx) => {
                              const shopCls = SHOP_COLORS[row.shop] ?? 'bg-muted/20 text-muted-foreground border-border'
                              const locPath = [row.part_lv3, row.part_lv4].filter(Boolean).join(' › ')

                              return (
                                <div key={idx}
                                  className="grid grid-cols-[1fr_1.8fr_auto_auto] gap-x-3 items-start px-6 py-3.5 hover:bg-muted/20 transition-colors">

                                  {/* Col 1: Location */}
                                  <div className="min-w-0 pt-0.5">
                                    {locPath ? (
                                      <p className="text-sm text-foreground leading-snug">{locPath}</p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">—</p>
                                    )}
                                  </div>

                                  {/* Col 2: Fault + model chips */}
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-start gap-1.5 flex-wrap">
                                      {row.fault_code && row.fault_code !== '—' && (
                                        <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0 leading-tight">
                                          {row.fault_code}
                                        </span>
                                      )}
                                      <span className="text-sm text-foreground font-medium leading-snug">{row.fault_name}</span>
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {row.model_damas > 0 && (
                                        <span className="text-xs bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded font-medium">
                                          DAMAS ×{row.model_damas}
                                        </span>
                                      )}
                                      {row.model_labo > 0 && (
                                        <span className="text-xs bg-green-500/10 text-green-300 px-1.5 py-0.5 rounded font-medium">
                                          LABO ×{row.model_labo}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Col 3: Shop */}
                                  <div className="flex justify-center pt-0.5">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold border whitespace-nowrap ${shopCls}`}>
                                      {row.shop}
                                    </span>
                                  </div>

                                  {/* Col 4: Count */}
                                  <div className="text-right pt-0.5">
                                    <span className="text-sm font-bold text-foreground">{row.total_count}</span>
                                  </div>

                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Escalation Modal ────────────────────────────────────────────────── */}
      {escModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Gradient header */}
            <div className="bg-gradient-to-r from-red-600/20 to-red-500/5 border-b border-red-500/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">DRL Eskalatsiya yaratish</h3>
                  <p className="text-xs text-muted-foreground">Muhandisga nuqson yuborish</p>
                </div>
              </div>
              <button onClick={() => setEscModal(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nuqson info */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3.5">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  {escModal.fault.fault_code !== '—' && (
                    <span className="text-xs font-mono bg-red-500/15 text-red-400 px-2 py-0.5 rounded-md font-bold">
                      {escModal.fault.fault_code}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground">{escModal.fault.fault_name}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="text-muted-foreground">Jami: <strong className="text-foreground">{escModal.fault.total_count} ta</strong></span>
                  <span className="text-muted-foreground">Sexi: <strong className="text-foreground">{escModal.fault.top_shop}</strong></span>
                  <span className="text-muted-foreground">DAMAS: <strong className="text-sky-400">{escModal.fault.model_damas}</strong></span>
                  <span className="text-muted-foreground">LABO: <strong className="text-emerald-400">{escModal.fault.model_labo}</strong></span>
                </div>
              </div>

              {/* Muhandis tanlash — kartochkalar */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mas&apos;ul muhandis
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'ga_engineer',      label: 'GA',      sub: 'GA Muhandis',      activeCls: 'border-emerald-500 bg-emerald-500/10',   textCls: 'text-emerald-400' },
                    { value: 'welding_engineer', label: 'Welding', sub: 'Welding Muh.',     activeCls: 'border-sky-500 bg-sky-500/10',           textCls: 'text-sky-400' },
                    { value: 'press_engineer',   label: 'Press',   sub: 'Press Shop',       activeCls: 'border-amber-500 bg-amber-500/10',       textCls: 'text-amber-400' },
                    { value: 'paint_engineer',   label: 'Paint',   sub: 'Paint Shop',       activeCls: 'border-violet-500 bg-violet-500/10',     textCls: 'text-violet-400' },
                    { value: 'sqe_engineer',     label: 'SQE',     sub: 'SQE Muhandis',     activeCls: 'border-pink-500 bg-pink-500/10',         textCls: 'text-pink-400' },
                    { value: 'qe_engineer',      label: 'QE',      sub: 'QE Muhandis',      activeCls: 'border-cyan-500 bg-cyan-500/10',         textCls: 'text-cyan-400' },
                    { value: 'pe_engineer',      label: 'PE',      sub: 'PE Muhandis',      activeCls: 'border-lime-500 bg-lime-500/10',         textCls: 'text-lime-400' },
                  ].map(r => {
                    const isSelected = escModal.assignedRole === r.value
                    return (
                      <button key={r.value} type="button"
                        onClick={() => setEscModal(m => m ? { ...m, assignedRole: r.value } : null)}
                        className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all ${
                          isSelected
                            ? `${r.activeCls} ${r.textCls} shadow-sm`
                            : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                        }`}>
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        )}
                        <span className="text-xs font-bold leading-tight">{r.label}</span>
                        <span className="text-[9px] leading-tight mt-0.5 opacity-70">{r.sub}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Prioritet */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prioritet</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'critical', label: 'Kritik',   emoji: '🔴', activeCls: 'bg-red-600 border-red-600 text-white' },
                    { key: 'high',     label: 'Yuqori',   emoji: '🟠', activeCls: 'bg-orange-500 border-orange-500 text-white' },
                    { key: 'medium',   label: "O'rtacha", emoji: '🟡', activeCls: 'bg-amber-500 border-amber-500 text-white' },
                  ].map(p => (
                    <button key={p.key} type="button"
                      onClick={() => setEscModal(m => m ? { ...m, priority: p.key } : null)}
                      className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5 ${
                        escModal.priority === p.key
                          ? p.activeCls
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/60'
                      }`}>
                      <span>{p.emoji}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Izoh */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Izoh <span className="normal-case font-normal text-muted-foreground/60">(ixtiyoriy)</span>
                </label>
                <textarea
                  value={escModal.note}
                  onChange={e => setEscModal(m => m ? { ...m, note: e.target.value } : null)}
                  placeholder="Qo'shimcha ma'lumot..."
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-sm resize-none focus:border-red-500/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Tugmalar */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEscModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  Bekor
                </button>
                <button onClick={submitEscalation} disabled={escSaving}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {escSaving ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Yuborilmoqda...</>
                  ) : (
                    <><Bell className="w-3.5 h-3.5" /> Eskalatsiya yuborish</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DRLPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <DRLPageContent />
    </Suspense>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// OYLIK DRL HISOBOT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const MONTHS_UZ_DRL = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr']
const SMENA_OPTS_DRL = ['A', 'B', 'D', '—'] as const
type SmenaOptDRL = 'A' | 'B' | 'D' | '—'
type DayCalendarDRL = { E: SmenaOptDRL; N: SmenaOptDRL }

interface DRLMonthlyResult {
  ok: boolean
  meta: { dateFrom: string; dateTo: string }
  results: Record<string, { importBatch: string; rowCount: number; rawCount: number; totalCount: number }>
  warnings: string[]
  totalRaw: number
  totalSkipped: number
}

function buildDaysInMonthDRL(year: number, month: number): string[] {
  const count = new Date(year, month, 0).getDate()
  return Array.from({ length: count }, (_, i) => {
    const d = i + 1
    return `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  })
}

function autoFillDRL(days: string[], startSmena: SmenaOptDRL): Record<string, DayCalendarDRL> {
  const rota: SmenaOptDRL[] = ['A', 'B', 'D']
  const idx = rota.indexOf(startSmena as any)
  const start = idx < 0 ? 0 : idx
  const cal: Record<string, DayCalendarDRL> = {}
  days.forEach((date, i) => {
    cal[date] = {
      E: rota[(start + i * 2)     % 3],
      N: rota[(start + i * 2 + 1) % 3],
    }
  })
  return cal
}

function DRLMonthlyModal({ onClose }: { onClose: () => void }) {
  const today = new Date()
  const prevM = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const [year,  setYear]  = useState(prevM.getFullYear())
  const [month, setMonth] = useState(prevM.getMonth() + 1)
  const [step,  setStep]  = useState<1 | 2 | 3>(1)

  const days = buildDaysInMonthDRL(year, month)

  const [calendar,  setCalendar]  = useState<Record<string, DayCalendarDRL>>(() =>
    Object.fromEntries(days.map(d => [d, { E: 'A' as SmenaOptDRL, N: 'B' as SmenaOptDRL }]))
  )
  const [calSaved,  setCalSaved]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  useEffect(() => {
    const newDays = buildDaysInMonthDRL(year, month)
    setCalendar(Object.fromEntries(newDays.map(d => [d, { E: 'A' as SmenaOptDRL, N: 'B' as SmenaOptDRL }])))
    setCalSaved(false); setDeleteMsg('')
    fetch(`/api/drl-import/monthly-calendar?year=${year}&month=${month}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.found && data.calendar) {
          const loaded: Record<string, DayCalendarDRL> = {}
          for (const date of newDays) {
            const saved = data.calendar[date]
            loaded[date] = { E: (saved?.E as SmenaOptDRL) ?? 'A', N: (saved?.N as SmenaOptDRL) ?? 'B' }
          }
          setCalendar(loaded); setCalSaved(true)
        }
      }).catch(() => {})
  }, [year, month])

  const setDay = (date: string, slot: 'E' | 'N', val: SmenaOptDRL) =>
    setCalendar(p => ({ ...p, [date]: { ...p[date], [slot]: val } }))

  const applyAutoFill = (start: SmenaOptDRL) =>
    setCalendar(autoFillDRL(buildDaysInMonthDRL(year, month), start))

  const [file,      setFile]      = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result,    setResult]    = useState<DRLMonthlyResult | null>(null)
  const [error,     setError]     = useState('')

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setError('')
    try {
      const cal: ShiftCalendar = {}
      for (const [date, slots] of Object.entries(calendar)) {
        const e = slots.E !== '—' ? slots.E : undefined
        const n = slots.N !== '—' ? slots.N : undefined
        if (e || n) cal[date] = { ...(e ? { E: e } : {}), ...(n ? { N: n } : {}) }
      }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('calendar', JSON.stringify(cal))
      const res  = await fetch('/api/drl-import/monthly', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Xatolik'); return }
      setResult(data)
    } catch (e: any) {
      setError(e.message ?? 'Tarmoq xatosi')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Oylik DRL Hisobot</h2>
              <p className="text-xs text-muted-foreground">Smena jadvali bilan import</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/10">
          {([{ n: 1, label: 'Oy tanlash' }, { n: 2, label: 'Smena jadvali' }, { n: 3, label: 'Fayl yuklash' }] as const).map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step===n?'bg-indigo-600 border-indigo-500 text-white':step>n?'bg-indigo-500/20 border-indigo-500/40 text-indigo-400':'bg-muted/30 border-border text-muted-foreground'}`}>
                {step > n ? '✓' : n}
              </div>
              <span className={`text-xs font-medium ${step===n?'text-foreground':'text-muted-foreground'}`}>{label}</span>
              {n < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Qaysi oyning DRL hisobotini kiritmoqchisiz?</p>
              <div className="flex items-center gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Yil</label>
                  <select value={year} onChange={e => setYear(Number(e.target.value))}
                    className="px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-foreground text-sm font-semibold focus:outline-none">
                    {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Oy</label>
                  <select value={month} onChange={e => setMonth(Number(e.target.value))}
                    className="px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-foreground text-sm font-semibold focus:outline-none">
                    {MONTHS_UZ_DRL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                <p className="text-sm font-semibold text-indigo-400 mb-1">{MONTHS_UZ_DRL[month-1]} {year} — {days.length} kun</p>
                <p className="text-xs text-muted-foreground">Keyingi qadamda har kunning kunduz va tungi smenasini belgilaysiz</p>
              </div>
              {calSaved && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-400">{MONTHS_UZ_DRL[month-1]} {year} uchun smena jadvali DB da saqlangan — avtomatik yuklandi</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{MONTHS_UZ_DRL[month-1]} {year} — Smena jadvali</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Avtoto&apos;ldirish:</span>
                  {(['A','B','D'] as SmenaOptDRL[]).map(s => (
                    <button key={s} onClick={() => applyAutoFill(s)}
                      className="px-2.5 py-1 bg-muted/40 border border-border rounded-lg text-xs font-bold text-foreground hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all">
                      {s} dan
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-muted/10 border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_1fr] text-xs font-semibold text-muted-foreground border-b border-border bg-muted/20">
                  <div className="px-4 py-2.5">Kun</div>
                  <div className="px-4 py-2.5 text-center border-l border-border">☀ Kunduz (E)</div>
                  <div className="px-4 py-2.5 text-center border-l border-border">🌙 Tungi (N)</div>
                </div>
                <div className="divide-y divide-border max-h-[380px] overflow-y-auto">
                  {days.map((date, i) => {
                    const d = i + 1
                    const dow = new Date(date).getDay()
                    const isWkd = dow === 0 || dow === 6
                    return (
                      <div key={date} className={`grid grid-cols-[auto_1fr_1fr] items-center ${isWkd ? 'bg-amber-500/5' : ''}`}>
                        <div className="px-4 py-2 min-w-[72px]">
                          <span className={`text-sm font-bold ${isWkd ? 'text-amber-400' : 'text-foreground'}`}>{d}-{MONTHS_UZ_DRL[month-1].toLowerCase().slice(0,3)}</span>
                          {isWkd && <span className="ml-1 text-[10px] text-amber-400/60">dam</span>}
                        </div>
                        {(['E','N'] as const).map(slot => (
                          <div key={slot} className="px-3 py-1.5 border-l border-border">
                            <div className="flex items-center gap-1 justify-center">
                              {SMENA_OPTS_DRL.map(opt => (
                                <button key={opt} onClick={() => setDay(date, slot, opt)}
                                  className={`w-8 h-7 rounded-md text-xs font-bold border transition-all ${
                                    calendar[date]?.[slot] === opt
                                      ? opt==='A'?'bg-blue-600 text-white border-blue-500'
                                        :opt==='B'?'bg-green-600 text-white border-green-500'
                                        :opt==='D'?'bg-purple-600 text-white border-purple-500'
                                        :'bg-muted text-muted-foreground border-border'
                                      :'bg-transparent text-muted-foreground border-border/50 hover:border-border'
                                  }`}>{opt}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600" />A smena</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-600" />B smena</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-600" />D smena</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted border border-border" />— (dam olish)</span>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-xs text-muted-foreground">
                <p className="font-semibold text-indigo-400 mb-1">{MONTHS_UZ_DRL[month-1]} {year} — Smena jadvali tayyorlandi ✓</p>
                <p>Endi GSIP DRL Defect Details Excel faylini yuklang. Tizim har bir yozuvni smena jadvaliga ko&apos;ra A/B/D ga ajratadi.</p>
              </div>
              {!result && (
                <label className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${file?'border-indigo-500/60 bg-indigo-500/5':'border-border hover:border-indigo-500/40 hover:bg-indigo-500/5'}`}>
                  <Upload className={`w-8 h-8 ${file?'text-indigo-400':'text-muted-foreground'}`} />
                  {file ? (
                    <><p className="text-sm font-semibold text-indigo-400">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size/1024).toFixed(0)} KB</p></>
                  ) : (
                    <><p className="text-sm font-semibold text-foreground">Excel faylni tanlang yoki tashlang</p><p className="text-xs text-muted-foreground">GSIP DRL Defect Details — .xlsx format</p></>
                  )}
                  <input type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); setError('') }} />
                </label>
              )}
              {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">{error}</div>}
              {deleteMsg && !result && (
                <div className={`p-3 rounded-xl border text-sm font-semibold ${deleteMsg.startsWith('✓')?'bg-emerald-500/10 border-emerald-500/30 text-emerald-400':'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {deleteMsg}
                </div>
              )}
              {result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-sm font-bold">Muvaffaqiyatli import qilindi!</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(result.results).map(([smena, r]) => (
                      <div key={smena} className={`rounded-xl border p-4 ${smena==='A'?'border-blue-500/30 bg-blue-500/5':smena==='B'?'border-green-500/30 bg-green-500/5':'border-purple-500/30 bg-purple-500/5'}`}>
                        <p className={`text-lg font-bold mb-1 ${smena==='A'?'text-blue-400':smena==='B'?'text-green-400':'text-purple-400'}`}>{smena} Smena</p>
                        <p className="text-2xl font-bold text-foreground">{r.totalCount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">nuqson · {r.rawCount} qayd</p>
                      </div>
                    ))}
                  </div>
                  {result.warnings.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-400">⚠ {w}</p>)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Jami {result.totalRaw.toLocaleString()} qayd · {result.totalSkipped.toLocaleString()} o&apos;tkazib yuborildi</p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Smena jadvalini saqlab qolgan holda faqat import ma&apos;lumotlarini o&apos;chirish:</p>
                    <button onClick={async () => {
                      if (!confirm(`${MONTHS_UZ_DRL[month-1]} ${year} DRL import ma'lumotlarini o'chirasizmi?`)) return
                      setDeleting(true); setDeleteMsg('')
                      try {
                        const res = await fetch(`/api/drl-import/monthly-calendar?year=${year}&month=${month}`, { method: 'DELETE' })
                        const data = await res.json()
                        if (res.ok) { setDeleteMsg(`✓ ${data.deletedBatches} ta batch o'chirildi.`); setResult(null); setFile(null) }
                        else setDeleteMsg(`✗ Xato: ${data.error}`)
                      } catch { setDeleteMsg('✗ Server bilan aloqa xatosi') }
                      finally { setDeleting(false) }
                    }} disabled={deleting}
                      className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center gap-2">
                      {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '🗑'} Faqat ma&apos;lumotlarni o&apos;chirish
                    </button>
                    {deleteMsg && <p className={`text-xs mt-2 font-medium ${deleteMsg.startsWith('✓')?'text-emerald-400':'text-red-400'}`}>{deleteMsg}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
          <button onClick={() => step===1 ? onClose() : setStep(s => (s-1) as 1|2|3)}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
            {step===1 ? 'Yopish' : '← Orqaga'}
          </button>
          {step < 3 && (
            <button onClick={() => setStep(s => (s+1) as 1|2|3)}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all">
              Davom etish →
            </button>
          )}
          {step === 3 && !result && (
            <button onClick={handleUpload} disabled={!file || uploading}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2">
              {uploading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Yuklanmoqda...</> : <><Upload className="w-4 h-4" /> Import qilish</>}
            </button>
          )}
          {step === 3 && result && (
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all">
              Tugallash ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

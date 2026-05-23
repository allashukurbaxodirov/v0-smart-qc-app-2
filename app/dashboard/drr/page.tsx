'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/page-header'
import {
  ChevronLeft, TrendingDown, AlertTriangle, RefreshCw,
  Car, Layers, Building2, FileSpreadsheet, Bell, Users,
  X, Search, Calendar,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  batchId:   string
  totals:    {
    row_count:   number
    total_count: number
    total_veh:   number
    damas_count: number
    labo_count:  number
    damas_veh:   number
    labo_veh:    number
    date_from:   string
    date_to:     string
    shift_from:  string
    shift_to:    string
    file_name:   string
  }
  byShop:    { shop: string; total: number; veh_total: number }[]
  byModel:   { model_label: string; total: number; veh_total: number }[]
  byPartLv1: { part_lv1: string; total: number; veh_total: number }[]
  top10:     Top10Fault[]
}

interface Top10Fault {
  rank:          number
  fault_code:    string
  fault_name:    string
  total_count:   number
  total_veh_cnt: number
  model_damas:   number
  model_labo:    number
  veh_damas:     number
  veh_labo:      number
  top_prod_team: string
  top_shop:      string
  top_part_lv1:  string
}

interface EscalationModal {
  fault:        Top10Fault
  assignedRole: string
  assignedName: string
  priority:     string
  note:         string
}

// ── Drilldown types ────────────────────────────────────────────────────────────
interface DrillRow {
  part_lv2:    string
  part_lv3:    string
  part_lv4:    string
  fault_code:  string
  fault_name:  string
  defect_note: string
  shop:        string
  prod_team:   string
  model_group: string
  total_count: number
  total_veh:   number
  model_damas: number
  model_labo:  number
}
interface DrillTotals { total_count: number; total_veh: number }
interface DrillData   { lv1: string; totals: DrillTotals; rows: DrillRow[] }

interface Batch {
  import_batch: string
  date_from:    string
  shift_from:   string
  shift_to:     string
  total_count:  number
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
  if (s === 'A') return 'Kech'
  if (s === 'L') return 'Kech'
  return s
}

function teamToRole(team: string) {
  if ((team || '').toUpperCase().startsWith('00.BO') ||
      (team || '').toUpperCase().startsWith('BO')) return 'welding_engineer'
  return 'ga_engineer'
}

// ─── Main Component ────────────────────────────────────────────────────────────
function DRRPageContent() {
  const searchParams = useSearchParams()
  const batchParam   = searchParams.get('batch')

  const [stats,    setStats]    = useState<Stats | null>(null)
  const [batches,  setBatches]  = useState<Batch[]>([])
  const [selBatch, setSelBatch] = useState<string>(batchParam ?? '')
  const [loading,  setLoading]  = useState(true)
  const [empty,    setEmpty]    = useState(false)
  const [detailShop, setDetailShop] = useState<string | null>(null)
  const [session,  setSession]  = useState<{ role: string; name: string } | null>(null)

  // Date filter
  const todayStr   = new Date().toISOString().split('T')[0]
  const monthStr   = todayStr.substring(0, 7)
  const yearStr    = todayStr.substring(0, 4)
  const [filterMode, setFilterMode] = useState<FilterMode>('batch')
  const [selDate,    setSelDate]    = useState(todayStr)
  const [selMonth,   setSelMonth]   = useState(monthStr)
  const [selYear,    setSelYear]    = useState(yearStr)

  // Eskalatsiya modal
  const [escModal,  setEscModal]  = useState<EscalationModal | null>(null)
  const [escSaving, setEscSaving] = useState(false)
  const [escDone,   setEscDone]   = useState<Set<string>>(new Set())

  // Drilldown drawer
  const [drill,        setDrill]        = useState<DrillData | null>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [drillSearch,  setDrillSearch]  = useState('')

  const openDrill = async (lv1: string) => {
    if (!stats?.batchId) return
    setDrillLoading(true)
    setDrill(null)
    setDrillSearch('')
    try {
      const res  = await fetch(`/api/drr-import/drilldown?batch=${stats.batchId}&lv1=${encodeURIComponent(lv1)}`)
      const data = await res.json()
      setDrill(data)
    } finally {
      setDrillLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])

  // Batch ro'yxatini yuklash
  useEffect(() => {
    fetch('/api/drr-import')
      .then(r => r.ok ? r.json() : [])
      .then((data: Batch[]) => {
        setBatches(data)
        if (!batchParam && data.length > 0) setSelBatch(data[0].import_batch)
      })
  }, [batchParam])

  // Statistika yuklash
  const loadStats = useCallback(async (params: { batch?: string; from?: string; to?: string }) => {
    setLoading(true)
    setEmpty(false)
    let url = '/api/drr-import/stats'
    if (params.batch) url = `/api/drr-import/stats?batch=${params.batch}`
    else if (params.from && params.to) url = `/api/drr-import/stats?from=${params.from}&to=${params.to}`
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
    if (selBatch) loadStats({ batch: selBatch })
    else if (batches.length === 0 && !loading) setEmpty(true)
  }, [filterMode, selBatch, loadStats])

  // Date mode
  useEffect(() => {
    if (filterMode === 'batch') return
    const range = getDateRange(filterMode, selDate, selMonth, selYear)
    if (range) loadStats({ from: range.from, to: range.to })
  }, [filterMode, selDate, selMonth, selYear, loadStats])

  // Eskalatsiya yuborish
  const submitEscalation = async () => {
    if (!escModal) return
    setEscSaving(true)
    try {
      await fetch('/api/drr-escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importBatch:  stats?.batchId,
          faultCode:    escModal.fault.fault_code,
          faultName:    escModal.fault.fault_name,
          shop:         escModal.fault.top_shop,
          prodTeam:     escModal.fault.top_prod_team,
          totalCount:   escModal.fault.total_count,
          totalVehCnt:  escModal.fault.total_veh_cnt,
          modelDamas:   escModal.fault.model_damas,
          modelLabo:    escModal.fault.model_labo,
          assignedRole: escModal.assignedRole,
          assignedName: escModal.assignedName,
          priority:     escModal.priority,
          note:         escModal.note,
        }),
      })
      setEscDone(prev => new Set(prev).add(escModal.fault.fault_code))
      setEscModal(null)
    } finally {
      setEscSaving(false)
    }
  }

  const isAdmin = session && ['superadmin', 'admin'].includes(session.role)

  // ── Seh tafsiloti ──────────────────────────────────────────────────────────
  if (detailShop) {
    const shopStat = stats?.byShop.find(s => s.shop === detailShop)
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title={detailShop}
          description="DRR rad etilganlar tafsiloti"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'DRR', href: '/dashboard/drr' },
            { label: detailShop },
          ]}
        />
        <div className="p-6 space-y-5">
          <button onClick={() => setDetailShop(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> Orqaga
          </button>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-1">{detailShop} — Jami nuqsonlar</p>
              <p className="text-4xl font-bold text-foreground">{shopStat?.total.toLocaleString() ?? 0}</p>
            </div>
            <div className="bg-card border border-orange-500/20 rounded-xl p-5 bg-orange-500/5">
              <p className="text-sm text-muted-foreground mb-1">Unique mashina soni</p>
              <p className="text-4xl font-bold text-orange-400">{shopStat?.veh_total.toLocaleString() ?? 0}</p>
            </div>
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
                    <td className="px-4 py-3 font-mono text-sm text-orange-400">{f.fault_code}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{f.fault_name}</td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{f.total_count}</td>
                    <td className="px-4 py-3 text-sm text-blue-300">{f.model_damas}</td>
                    <td className="px-4 py-3 text-sm text-green-300">{f.model_labo}</td>
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

  // ── Asosiy dashboard ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="DRR Dashboard"
        description="Daily Rejection Rate — GSIP import ma'lumotlari tahlili"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'DRR Dashboard' },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Orqaga
            </button>
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            {isAdmin && (
              <Link href="/dashboard/drr-admin">
                <button className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-all">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Yangi Import
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode tabs */}
          <div className="flex items-center bg-muted/40 border border-border rounded-xl p-1 gap-1">
            {([
              { key: 'batch',   label: 'Hammasi' },
              { key: 'kunlik',  label: 'Kunlik' },
              { key: 'oylik',   label: 'Oylik' },
              { key: 'yillik',  label: 'Yillik' },
            ] as { key: FilterMode; label: string }[]).map(m => (
              <button key={m.key}
                onClick={() => setFilterMode(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterMode === m.key
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                {m.label}
              </button>
            ))}
          </div>


          {/* Kunlik — date picker */}
          {filterMode === 'kunlik' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input type="date" value={selDate}
                onChange={e => setSelDate(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none" />
            </div>
          )}

          {/* Oylik — month picker */}
          {filterMode === 'oylik' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input type="month" value={selMonth}
                onChange={e => setSelMonth(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none" />
            </div>
          )}

          {/* Yillik — year select */}
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

          {/* Refresh */}
          <button onClick={() => {
            if (filterMode === 'batch') loadStats({ batch: selBatch })
            else {
              const range = getDateRange(filterMode, selDate, selMonth, selYear)
              if (range) loadStats(range)
            }
          }}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
          </button>
        </div>

        {/* Bo'sh holat */}
        {empty && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <FileSpreadsheet className="w-14 h-14 text-muted-foreground" />
            <p className="text-foreground font-semibold">Hali GSIP DRR import qilinmagan</p>
            <p className="text-sm text-muted-foreground">
              DRR ma&apos;lumotlarini ko&apos;rish uchun Excel faylni yuklang
            </p>
            {isAdmin && (
              <Link href="/dashboard/drr-admin">
                <button className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 transition-all">
                  Excel yuklash →
                </button>
              </Link>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        )}

        {stats && !loading && (
          <>

            {/* KPI Cards — 3 ta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Jami nuqsonlar',      value: stats.totals.total_count,  icon: <AlertTriangle className="w-5 h-5" />, color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
                { label: 'DAMAS (R7) nuqson',   value: stats.totals.damas_count,  icon: <Car className="w-5 h-5" />,          color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
                { label: 'LABO (R7A) nuqson',   value: stats.totals.labo_count,   icon: <Car className="w-5 h-5" />,          color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20' },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} className={`rounded-xl border p-5 ${bg}`}>
                  <div className={`mb-2 ${color}`}>{icon}</div>
                  <p className="text-2xl font-bold text-foreground">{value?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Sehlar bo'yicha — Pie Chart */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
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
                          cx="50%" cy="50%"
                          innerRadius={65} outerRadius={110}
                          paddingAngle={3}
                          onClick={(entry) => setDetailShop(entry.shop)}
                          style={{ cursor: 'pointer' }}
                        >
                          {stats.byShop.map(s => (
                            <Cell key={s.shop} fill={SHOP_HEX[s.shop] ?? '#6b7280'} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string, props: any) => {
                            const veh = props?.payload?.veh_total ?? 0
                            return [`${value.toLocaleString()} nuqson · ${veh} mashina`, '']
                          }}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '10px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '13px',
                          }}
                        />
                        <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle"
                          style={{ fill: 'hsl(var(--foreground))', fontSize: 22, fontWeight: 700 }}>
                          {stats.totals.total_count.toLocaleString()}
                        </text>
                        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle"
                          style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}>
                          jami nuqson
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend cards */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {stats.byShop.map(s => {
                      const pct = stats.totals.total_count > 0
                        ? ((s.total / stats.totals.total_count) * 100).toFixed(1)
                        : '0'
                      const hex = SHOP_HEX[s.shop] ?? '#6b7280'
                      return (
                        <button key={s.shop} onClick={() => setDetailShop(s.shop)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all text-left group">
                          <div className="w-3 h-12 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">{s.shop}</p>
                            <p className="text-xl font-bold text-foreground leading-tight">{s.total.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">nuqson</span></p>
                            <p className="text-xs font-semibold" style={{ color: hex }}>{s.veh_total} mashina</p>
                            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hex }} />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold" style={{ color: hex }}>{pct}%</p>
                            <p className="text-xs text-muted-foreground group-hover:text-foreground">tafsilot →</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Top 10 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-500" />
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
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Nuqson soni</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">DAMAS</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">LABO</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Qism</th>
                        {isAdmin && <th className="px-4 py-3 w-28"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.top10.map((f) => {
                        const maxCount = stats.top10[0]?.total_count ?? 1
                        const barWidth = Math.round((f.total_count / maxCount) * 100)
                        const shopCls  = SHOP_COLORS[f.top_shop] ?? 'bg-muted/20 text-muted-foreground border-border'
                        const isDone   = escDone.has(f.fault_code)
                        return (
                          <tr key={f.fault_code} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${rankColor(f.rank)}`}>
                                {f.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-[220px]">
                              <div className="min-w-0">
                                {f.fault_code !== '—' && (
                                  <span className="text-xs font-mono text-orange-400 mr-1">{f.fault_code}</span>
                                )}
                                <span className="text-sm text-foreground">{f.fault_name}</span>
                              </div>
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
                                  <span className="text-xs text-green-400 font-medium">✓ Yuborildi</span>
                                ) : (
                                  <button
                                    onClick={() => setEscModal({
                                      fault:        f,
                                      assignedRole: teamToRole(f.top_prod_team ?? ''),
                                      assignedName: '',
                                      priority:     f.total_count >= 50 ? 'critical' : f.total_count >= 20 ? 'high' : 'medium',
                                      note:         '',
                                    })}
                                    className="flex items-center gap-1 px-2 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg text-xs font-semibold hover:bg-orange-500/20 transition-colors"
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

            {/* Qism kategoriyalari */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" />
                Qism kategoriyalari bo&apos;yicha (Top 10)
                <span className="text-xs font-normal text-muted-foreground ml-1">— batafsil ko&apos;rish uchun bosing</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.byPartLv1.slice(0, 10).map(p => {
                  const pct = stats.totals.total_count > 0
                    ? Math.round((p.total / stats.totals.total_count) * 100)
                    : 0
                  return (
                    <button key={p.part_lv1} onClick={() => openDrill(p.part_lv1)}
                      className="bg-card border border-border rounded-xl p-3 text-left hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group cursor-pointer">
                      <p className="text-xs text-muted-foreground truncate mb-1 group-hover:text-orange-400 transition-colors">{p.part_lv1}</p>
                      <p className="text-xl font-bold text-foreground">{p.total.toLocaleString()}</p>
                      <p className="text-xs text-orange-400">{p.veh_total} mashina</p>
                      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                        <span className="text-xs text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">tafsilot →</span>
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
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground text-base truncate">{drill?.lv1 ?? '...'}</h3>
                  {drill && (
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        Jami: <strong className="text-foreground">{drill.totals.total_count}</strong> ta nuqson
                      </span>
                      <span className="text-xs text-orange-400 font-semibold">
                        {drill.totals.total_veh} ta mashina
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
                    placeholder="Qidirish: nuqson nomi, kodi, joylashuv, izoh..."
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
              <div className="grid grid-cols-[1fr_1.6fr_auto_auto] gap-x-3 px-6 py-2.5 border-b border-border bg-muted/20 shrink-0">
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
                  <RefreshCw className="w-7 h-7 animate-spin text-orange-500" />
                </div>
              )}

              {drill && (() => {
                const search = drillSearch.toLowerCase()
                const filtered = search
                  ? drill.rows.filter(r =>
                      r.fault_name.toLowerCase().includes(search) ||
                      r.fault_code.toLowerCase().includes(search) ||
                      r.defect_note.toLowerCase().includes(search) ||
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

                // Group by lv2 only — flat rows inside each section
                const byLv2: Record<string, DrillRow[]> = {}
                for (const row of filtered) {
                  const lv2 = row.part_lv2 || '—'
                  if (!byLv2[lv2]) byLv2[lv2] = []
                  byLv2[lv2].push(row)
                }

                return (
                  <div className="divide-y divide-border">
                    {Object.entries(byLv2).map(([lv2, rows]) => {
                      const secTotal = rows.reduce((s, r) => s + r.total_count, 0)
                      const secVeh   = rows.reduce((s, r) => s + r.total_veh, 0)
                      return (
                        <div key={lv2}>
                          {/* Lv2 section header — sticky */}
                          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-2.5 bg-muted/60 backdrop-blur-sm border-b border-border">
                            <span className="text-sm font-bold text-foreground">{lv2}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{secTotal} nuqson</span>
                              <span className="text-xs font-semibold text-orange-400">{secVeh} mashina</span>
                            </div>
                          </div>

                          {/* Flat rows */}
                          <div className="divide-y divide-border/50">
                            {rows.map((row, idx) => {
                              const shopCls = SHOP_COLORS[row.shop] ?? 'bg-muted/20 text-muted-foreground border-border'
                              // Build location path: lv3 (> lv4 if exists)
                              const locPath = [row.part_lv3, row.part_lv4].filter(Boolean).join(' › ')

                              return (
                                <div key={idx}
                                  className="grid grid-cols-[1fr_1.6fr_auto_auto] gap-x-3 items-start px-6 py-3.5 hover:bg-muted/20 transition-colors">

                                  {/* Col 1: Location (lv3 > lv4) */}
                                  <div className="min-w-0 pt-0.5">
                                    {locPath ? (
                                      <p className="text-sm text-foreground leading-snug">{locPath}</p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">—</p>
                                    )}
                                  </div>

                                  {/* Col 2: Fault code + name + defect note */}
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-start gap-1.5 flex-wrap">
                                      {row.fault_code && row.fault_code !== '—' && (
                                        <span className="text-xs font-mono font-bold bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded shrink-0 leading-tight">
                                          {row.fault_code}
                                        </span>
                                      )}
                                      <span className="text-sm text-foreground font-medium leading-snug">{row.fault_name}</span>
                                    </div>
                                    {row.defect_note && (
                                      <p className="text-xs text-sky-300">📝 {row.defect_note}</p>
                                    )}
                                    {/* Model chips */}
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

      {/* ── Eskalatsiya Modal ──────────────────────────────────────────────── */}
      {escModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">DRR Eskalatsiya yaratish</h3>
                <p className="text-xs text-muted-foreground">Injener ga yuborish</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {escModal.fault.fault_code !== '—' && (
                  <span className="text-xs font-mono bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">
                    {escModal.fault.fault_code}
                  </span>
                )}
                <span className="text-sm font-semibold text-foreground">{escModal.fault.fault_name}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Nuqson: <strong className="text-foreground">{escModal.fault.total_count}</strong></span>
                <span>Mashina: <strong className="text-orange-400">{escModal.fault.total_veh_cnt}</strong></span>
                <span>Sexi: <strong className="text-foreground">{escModal.fault.top_shop}</strong></span>
                <span>DAMAS: <strong className="text-blue-300">{escModal.fault.model_damas}</strong></span>
                <span>LABO: <strong className="text-green-300">{escModal.fault.model_labo}</strong></span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Mas&apos;ul injener roli
              </label>
              <select
                value={escModal.assignedRole}
                onChange={e => setEscModal(m => m ? { ...m, assignedRole: e.target.value } : null)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm"
              >
                <option value="ga_engineer">GA Injener</option>
                <option value="welding_engineer">Welding Injener</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prioritet</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'critical', label: '🔴 Kritik' },
                  { key: 'high',     label: '🟠 Yuqori' },
                  { key: 'medium',   label: '🟡 O\'rtacha' },
                ].map(p => (
                  <button key={p.key} type="button"
                    onClick={() => setEscModal(m => m ? { ...m, priority: p.key } : null)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      escModal.priority === p.key
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-background border-border text-foreground hover:border-orange-500/50'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Izoh (ixtiyoriy)
              </label>
              <textarea
                value={escModal.note}
                onChange={e => setEscModal(m => m ? { ...m, note: e.target.value } : null)}
                placeholder="Qo'shimcha ma'lumot..."
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-sm resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEscModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                Bekor
              </button>
              <button onClick={submitEscalation} disabled={escSaving}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors">
                {escSaving ? 'Yuborilmoqda...' : '🚨 Eskalatsiya yuborish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DRRPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <DRRPageContent />
    </Suspense>
  )
}

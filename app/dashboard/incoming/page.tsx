'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/page-header'
import {
  ChevronLeft, RefreshCw, Package, AlertTriangle, CheckCircle,
  TrendingDown, Building2, Users, Calendar, ShieldCheck,
  Layers, FileText, Activity,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Totals {
  row_count:      number
  total_parts:    number
  total_defects:  number
  acceptance_rate:number
  defect_rate:    number
  supplier_count: number
  part_count:     number
  date_from:      string
  date_to:        string
  today_parts:    number
  today_defects:  number
  today_entries:  number
}

interface WarehouseRow {
  warehouse:      string
  entry_count:    number
  total_parts:    number
  total_defects:  number
  defect_rate:    number
  acceptance_rate:number
  supplier_count: number
}

interface SupplierRow {
  supplier:       string
  entry_count:    number
  total_parts:    number
  total_defects:  number
  defect_rate:    number
  part_types:     number
}

interface DefectRow {
  defect_name:    string
  defect_code:    string | null
  entry_count:    number
  total_defects:  number
  supplier_count: number
  part_count:     number
}

interface PartRow {
  part_number:    string
  part_name:      string
  entry_count:    number
  total_parts:    number
  total_defects:  number
  defect_rate:    number
  supplier_count: number
}

interface ShiftRow {
  shift:          string
  entry_count:    number
  total_parts:    number
  total_defects:  number
  defect_rate:    number
}

interface DayRow {
  day:            string
  total_parts:    number
  total_defects:  number
  entry_count:    number
  defect_rate:    number
}

interface OperatorRow {
  operator:       string
  entry_count:    number
  total_parts:    number
  total_defects:  number
}

interface Stats {
  totals:       Totals
  byWarehouse:  WarehouseRow[]
  topSuppliers: SupplierRow[]
  topDefects:   DefectRow[]
  topParts:     PartRow[]
  byShift:      ShiftRow[]
  dailyTrend:   DayRow[]
  byOperator:   OperatorRow[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
type FilterMode = 'kunlik' | 'oylik' | 'yillik' | 'custom'

const WAREHOUSE_LABELS: Record<string, string> = {
  'WAREHOUSE-1': 'Warehouse-1',
  'WAREHOUSE-2': 'Warehouse-2',
  'SP ZONE':     'SP-Zone',
}
const WAREHOUSE_COLORS: Record<string, string> = {
  'WAREHOUSE-1': '#6366f1',
  'WAREHOUSE-2': '#0ea5e9',
  'SP ZONE':     '#10b981',
}
const WAREHOUSE_BG: Record<string, string> = {
  'WAREHOUSE-1': 'bg-indigo-500/10 border-indigo-500/20',
  'WAREHOUSE-2': 'bg-sky-500/10 border-sky-500/20',
  'SP ZONE':     'bg-emerald-500/10 border-emerald-500/20',
}

function getDateRange(mode: FilterMode, selDate: string, selMonth: string, selYear: string, customFrom: string, customTo: string) {
  const today = new Date().toISOString().split('T')[0]
  if (mode === 'kunlik') return { from: selDate, to: selDate }
  if (mode === 'oylik') {
    const [y, m] = selMonth.split('-').map(Number)
    const last   = new Date(y, m, 0).getDate()
    return { from: `${selMonth}-01`, to: `${selMonth}-${String(last).padStart(2, '0')}` }
  }
  if (mode === 'yillik') return { from: `${selYear}-01-01`, to: `${selYear}-12-31` }
  if (mode === 'custom') return { from: customFrom || today, to: customTo || today }
  return { from: today, to: today }
}

function acceptanceColor(rate: number) {
  if (rate >= 98) return 'text-green-400'
  if (rate >= 95) return 'text-amber-400'
  return 'text-red-400'
}

function defectRateColor(rate: number) {
  if (rate <= 2)  return 'text-green-400'
  if (rate <= 5)  return 'text-amber-400'
  return 'text-red-400'
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IncomingDashboardPage() {
  const today   = new Date().toISOString().split('T')[0]
  const month   = today.substring(0, 7)
  const year    = today.substring(0, 4)

  const [stats,     setStats]     = useState<Stats | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [empty,     setEmpty]     = useState(false)
  const [session,   setSession]   = useState<{ role: string } | null>(null)

  // Filter state
  const [filterMode,  setFilterMode]  = useState<FilterMode>('oylik')
  const [selDate,     setSelDate]     = useState(today)
  const [selMonth,    setSelMonth]    = useState(month)
  const [selYear,     setSelYear]     = useState(year)
  const [customFrom,  setCustomFrom]  = useState(today)
  const [customTo,    setCustomTo]    = useState(today)
  const [selWarehouse,setSelWarehouse]= useState<string>('')  // '' = barchasi

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'suppliers' | 'parts' | 'defects'>('overview')

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])

  const loadStats = useCallback(async (range: { from: string; to: string }, wh: string) => {
    setLoading(true)
    setEmpty(false)
    const p = new URLSearchParams({ from: range.from, to: range.to })
    if (wh) p.set('warehouse', wh)
    try {
      const res  = await fetch(`/api/incoming/stats?${p}`)
      const data = await res.json()
      if (data.empty || !data.totals) { setEmpty(true); setStats(null) }
      else setStats(data)
    } catch { setEmpty(true) }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => {
    const range = getDateRange(filterMode, selDate, selMonth, selYear, customFrom, customTo)
    loadStats(range, selWarehouse)
  }, [filterMode, selDate, selMonth, selYear, customFrom, customTo, selWarehouse, loadStats])

  const isAdmin = session && ['superadmin', 'admin'].includes(session.role)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Incoming Control"
        description="Kiruvchi nazorat — omborlar bo'yicha detal qabul va nuqson tahlili"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Incoming Control' },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Orqaga
            </button>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            {isAdmin && (
              <Link href="/dashboard/incoming-admin">
                <button className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all">
                  <Package className="w-3.5 h-3.5" /> Boshqaruv
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode tabs */}
          <div className="flex items-center bg-muted/40 border border-border rounded-xl p-1 gap-1">
            {([
              { key: 'kunlik', label: 'Kunlik' },
              { key: 'oylik',  label: 'Oylik'  },
              { key: 'yillik', label: 'Yillik' },
              { key: 'custom', label: 'Erkin'  },
            ] as { key: FilterMode; label: string }[]).map(m => (
              <button key={m.key}
                onClick={() => setFilterMode(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterMode === m.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Date pickers */}
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
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          )}
          {filterMode === 'custom' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none" />
              <span className="text-muted-foreground text-xs">—</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none" />
            </div>
          )}

          {/* Ombor filter */}
          <select value={selWarehouse} onChange={e => setSelWarehouse(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground outline-none">
            <option value="">Barcha omborlar</option>
            <option value="WAREHOUSE-1">Warehouse-1</option>
            <option value="WAREHOUSE-2">Warehouse-2</option>
            <option value="SP ZONE">SP-Zone</option>
          </select>

          {/* Refresh */}
          <button onClick={() => {
            const range = getDateRange(filterMode, selDate, selMonth, selYear, customFrom, customTo)
            loadStats(range, selWarehouse)
          }}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        )}

        {/* Empty */}
        {empty && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="w-14 h-14 text-muted-foreground" />
            <p className="text-foreground font-semibold">Tanlangan davr uchun ma'lumot yo'q</p>
            <p className="text-sm text-muted-foreground">Boshqa sana yoki ombor tanlang</p>
          </div>
        )}

        {stats && !loading && (
          <>
            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Bugun */}
              <div className="bg-card border border-border rounded-xl p-5 col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugun</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.totals.today_parts.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">detal qabul qilindi</p>
                {stats.totals.today_defects > 0 && (
                  <p className="text-xs text-red-400 mt-1 font-semibold">
                    {stats.totals.today_defects} ta nuqsonli
                  </p>
                )}
              </div>

              {/* Jami kirim */}
              <div className="bg-card border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jami kirim</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.totals.total_parts.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.totals.row_count} ta yozuv</p>
              </div>

              {/* Nuqson */}
              <div className={`bg-card rounded-xl p-5 border ${
                Number(stats.totals.defect_rate) > 5
                  ? 'border-red-500/30 bg-red-500/5'
                  : Number(stats.totals.defect_rate) > 2
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className={`w-4 h-4 ${defectRateColor(Number(stats.totals.defect_rate))}`} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nuqsonli</span>
                </div>
                <p className={`text-3xl font-bold ${defectRateColor(Number(stats.totals.defect_rate))}`}>
                  {stats.totals.total_defects.toLocaleString()}
                </p>
                <p className={`text-xs font-semibold mt-1 ${defectRateColor(Number(stats.totals.defect_rate))}`}>
                  {Number(stats.totals.defect_rate).toFixed(1)}% nuqson foizi
                </p>
              </div>

              {/* Acceptance Rate */}
              <div className={`bg-card rounded-xl p-5 border ${
                Number(stats.totals.acceptance_rate) >= 98
                  ? 'border-green-500/20 bg-green-500/5'
                  : Number(stats.totals.acceptance_rate) >= 95
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-red-500/20 bg-red-500/5'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className={`w-4 h-4 ${acceptanceColor(Number(stats.totals.acceptance_rate))}`} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acceptance</span>
                </div>
                <p className={`text-3xl font-bold ${acceptanceColor(Number(stats.totals.acceptance_rate))}`}>
                  {Number(stats.totals.acceptance_rate).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totals.supplier_count} ta yetkazib beruvchi
                </p>
              </div>
            </div>

            {/* ── Alert banner ──────────────────────────────────────────── */}
            {Number(stats.totals.acceptance_rate) < 95 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-400 font-semibold">
                  Diqqat! Acceptance rate {Number(stats.totals.acceptance_rate).toFixed(1)}% — maqsad &gt;95%.
                  {stats.topSuppliers[0] && ` Eng muammoli yetkazib beruvchi: ${stats.topSuppliers[0].supplier}`}
                </p>
              </div>
            )}

            {/* ── Omborlar ─────────────────────────────────────────────── */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                Omborlar bo&apos;yicha
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Show all 3 warehouses, even if 0 */}
                {['WAREHOUSE-1', 'WAREHOUSE-2', 'SP ZONE'].map(wh => {
                  const row = stats.byWarehouse.find(r => r.warehouse === wh)
                  const label = WAREHOUSE_LABELS[wh] ?? wh
                  const color = WAREHOUSE_COLORS[wh] ?? '#6b7280'
                  const bg    = WAREHOUSE_BG[wh] ?? 'bg-muted/10 border-border'
                  const total = Number(row?.total_parts   ?? 0)
                  const def   = Number(row?.total_defects ?? 0)
                  const rate  = Number(row?.defect_rate   ?? 0)
                  const acc   = Number(row?.acceptance_rate ?? 100)
                  const grandTotal = Number(stats.totals.total_parts)
                  const pct   = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : '0'
                  return (
                    <div key={wh} className={`bg-card border rounded-2xl p-5 ${bg}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-bold text-foreground">{label}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          acc >= 98 ? 'bg-green-500/15 text-green-400'
                          : acc >= 95 ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                        }`}>
                          {acc.toFixed(1)}%
                        </span>
                      </div>

                      <p className="text-4xl font-bold text-foreground mb-1">{total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mb-3">detal qabul · {pct}% ulushi</p>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Nuqsonli</span>
                          <span className={`font-semibold ${def > 0 ? defectRateColor(rate) : 'text-green-400'}`}>
                            {def.toLocaleString()} ta ({rate.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        {row && (
                          <div className="flex justify-between text-xs text-muted-foreground pt-1">
                            <span>{row.supplier_count} ta supplier</span>
                            <span>{row.entry_count} ta yozuv</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Kunlik Trend BarChart ─────────────────────────────────── */}
            {stats.dailyTrend.length > 1 && (
              <div>
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Kunlik trend
                  <span className="text-xs font-normal text-muted-foreground ml-1">— detal kirim va nuqsonlar</span>
                </h2>
                <div className="bg-card border border-border rounded-2xl p-5">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.dailyTrend.map(d => ({
                      day: d.day.slice(5), // MM-DD
                      kirim:   d.total_parts,
                      nuqson:  d.total_defects,
                    }))} barGap={3} barCategoryGap="25%"
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', color: 'hsl(var(--foreground))', fontSize: '13px' }}
                        formatter={(value: number, name: string) => [value.toLocaleString(), name === 'kirim' ? 'Detal kirim' : 'Nuqsonli']}
                      />
                      <Bar dataKey="kirim"  name="kirim"  fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="nuqson" name="nuqson" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex items-center gap-4 justify-center mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Detal kirim</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-red-500" />
                      <span className="text-xs text-muted-foreground">Nuqsonli</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1 w-fit">
              {([
                { key: 'overview',   label: 'Umumiy',     icon: <Layers className="w-3.5 h-3.5" /> },
                { key: 'suppliers',  label: 'Supplierlar', icon: <Users className="w-3.5 h-3.5" /> },
                { key: 'parts',      label: 'Detallar',   icon: <FileText className="w-3.5 h-3.5" /> },
                { key: 'defects',    label: 'Nuqsonlar',  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
              ] as { key: typeof activeTab; label: string; icon: React.ReactNode }[]).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === t.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Smena bo'yicha */}
                <div>
                  <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Smena bo&apos;yicha
                  </h2>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {['Smena', 'Kirim', 'Nuqson', 'Nuqson %', 'Yozuv'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stats.byShift.map(s => (
                          <tr key={s.shift} className="hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {s.shift || '—'} smena
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">{Number(s.total_parts).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-bold text-red-400">{Number(s.total_defects).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-bold ${defectRateColor(Number(s.defect_rate))}`}>
                                {Number(s.defect_rate).toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{s.entry_count}</td>
                          </tr>
                        ))}
                        {stats.byShift.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">Ma'lumot yo'q</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Operator bo'yicha */}
                <div>
                  <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Operator faolligi
                  </h2>
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {['Operator', 'Yozuv', 'Kirim', 'Nuqson'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stats.byOperator.map((o, i) => (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-4 py-3 text-sm font-medium text-foreground">{o.operator}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{o.entry_count}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{Number(o.total_parts).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-bold text-red-400">{Number(o.total_defects).toLocaleString()}</td>
                          </tr>
                        ))}
                        {stats.byOperator.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">Ma'lumot yo'q</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUPPLIERS TAB ─────────────────────────────────────────── */}
            {activeTab === 'suppliers' && (
              <div>
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Top 10 eng ko&apos;p nuqsonli yetkazib beruvchilar
                </h2>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Yetkazib beruvchi</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Jami kirim</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Nuqsonli</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Nuqson %</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Detal turi</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Daraja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stats.topSuppliers.map((s, i) => {
                          const maxDef = Number(stats.topSuppliers[0]?.total_defects ?? 1)
                          const barW   = Math.round((Number(s.total_defects) / maxDef) * 100)
                          const rate   = Number(s.defect_rate)
                          return (
                            <tr key={s.supplier} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  i === 0 ? 'bg-red-600' : i === 1 ? 'bg-red-500' : i === 2 ? 'bg-orange-500' : 'bg-amber-500'
                                }`}>{i + 1}</span>
                              </td>
                              <td className="px-4 py-3 max-w-[200px]">
                                <p className="text-sm font-semibold text-foreground truncate">{s.supplier}</p>
                                <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden max-w-[150px]">
                                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${barW}%` }} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-foreground">{Number(s.total_parts).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-red-400">{Number(s.total_defects).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-sm font-bold ${defectRateColor(rate)}`}>{rate.toFixed(1)}%</span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-muted-foreground">{s.part_types}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  rate > 10 ? 'bg-red-500/15 text-red-400'
                                  : rate > 5 ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-green-500/15 text-green-400'
                                }`}>
                                  {rate > 10 ? 'Yuqori xavf' : rate > 5 ? 'O\'rtacha' : 'Qoniqarli'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                        {stats.topSuppliers.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Nuqsonli yetkazib beruvchi topilmadi
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── PARTS TAB ──────────────────────────────────────────────── */}
            {activeTab === 'parts' && (
              <div>
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Top 10 eng ko&apos;p nuqsonli detallar
                </h2>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-8">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Detal raqami</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nomi</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Kirim</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Nuqson</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Nuqson %</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Supplier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stats.topParts.map((p, i) => {
                          const rate = Number(p.defect_rate)
                          return (
                            <tr key={p.part_number} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 text-sm font-bold text-muted-foreground">{i + 1}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                                  {p.part_number}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground max-w-[180px] truncate">{p.part_name}</td>
                              <td className="px-4 py-3 text-right text-sm text-foreground">{Number(p.total_parts).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-red-400">{Number(p.total_defects).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-sm font-bold ${defectRateColor(rate)}`}>{rate.toFixed(1)}%</span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-muted-foreground">{p.supplier_count}</td>
                            </tr>
                          )
                        })}
                        {stats.topParts.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Nuqsonli detal topilmadi
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── DEFECTS TAB ────────────────────────────────────────────── */}
            {activeTab === 'defects' && (
              <div>
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-emerald-500" />
                  Top 10 eng ko&apos;p uchraydigan nuqsonlar
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {stats.topDefects.map((d, i) => {
                    const maxDef = Number(stats.topDefects[0]?.total_defects ?? 1)
                    const pct    = Math.round((Number(d.total_defects) / maxDef) * 100)
                    return (
                      <div key={i} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              i === 0 ? 'bg-red-600' : i === 1 ? 'bg-red-500' : i === 2 ? 'bg-orange-500' : 'bg-amber-500'
                            }`}>{i + 1}</span>
                            <p className="text-sm font-semibold text-foreground leading-snug">{d.defect_name}</p>
                          </div>
                          <span className="text-lg font-bold text-red-400 shrink-0">{Number(d.total_defects).toLocaleString()}</span>
                        </div>
                        {d.defect_code && (
                          <span className="text-xs font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded mb-2 inline-block">
                            {d.defect_code}
                          </span>
                        )}
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{d.supplier_count} ta supplier</span>
                          <span className="text-xs text-muted-foreground">{d.part_count} ta detal</span>
                        </div>
                      </div>
                    )
                  })}
                  {stats.topDefects.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                      Nuqson kodi kiritilmagan
                    </div>
                  )}
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

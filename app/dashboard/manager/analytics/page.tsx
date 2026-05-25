'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/page-header'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceLine,
} from 'recharts'
import {
  ChevronLeft, RefreshCw, Calendar, TrendingDown, TrendingUp,
  Activity, Building2, BarChart2, Layers, Car,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShiftData {
  total:    number
  damas:    number
  labo:     number
  byShop:   { shop: string; total: number }[]
  top5:     { fault_code: string; fault_name: string; total: number }[]
}

interface GcaShiftData {
  total_weight: number
  veh_count:    number
  wdpv:         number
  damas_weight: number
  labo_weight:  number
  damas_veh:    number
  labo_veh:     number
  byShop:       { shop: string; total_weight: number; veh_count: number; wdpv: number }[]
}

interface SmenaCompare {
  period:  { from: string; to: string }
  drl:     Record<'A'|'B'|'D', ShiftData>
  gca:     Record<'A'|'B'|'D', GcaShiftData>
  drr:     { total: number; veh_total: number; byShop: { shop: string; total: number; veh_total: number }[] }
}

interface MonthPoint {
  month:      string
  drl:        number
  drl_damas:  number
  drl_labo:   number
  drr:        number
  drr_veh:    number
  gca_weight: number
  gca_veh:    number
  gca_wdpv:   number
}

interface TrendData {
  monthly:     MonthPoint[]
  shopMonthly: Record<string, { month: string; shop: string; total: number }[]>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS_UZ = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']
function fmtMonth(m: string) {
  const [, mo] = m.split('-').map(Number)
  return MONTHS_UZ[(mo ?? 1) - 1] ?? m
}

const SHIFT_COLORS: Record<string, string> = {
  A: '#3b82f6',  // blue
  B: '#10b981',  // emerald
  D: '#f59e0b',  // amber
}
const SHIFT_BG: Record<string, string> = {
  A: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  B: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  D: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
}

const SHOP_HEX: Record<string, string> = {
  'WELDING':    '#0284c7',
  'PAINT SHOP': '#7c3aed',
  'GA':         '#059669',
  'PRESS SHOP': '#d97706',
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">
            {typeof p.value === 'number' && p.value % 1 !== 0 ? p.value.toFixed(2) : (p.value?.toLocaleString?.() ?? p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Default period: current year ─────────────────────────────────────────────
function defaultPeriod() {
  const now = new Date()
  const y   = now.getFullYear()
  return { from: `${y}-01-01`, to: now.toISOString().slice(0, 10) }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ManagerAnalyticsPage() {
  const [period,     setPeriod]     = useState(defaultPeriod)
  const [activeTab,  setActiveTab]  = useState<'sehlar'|'smenalar'|'trend'>('sehlar')

  const [smena,      setSmena]      = useState<SmenaCompare | null>(null)
  const [trend,      setTrend]      = useState<TrendData | null>(null)
  const [loadingS,   setLoadingS]   = useState(false)
  const [loadingT,   setLoadingT]   = useState(false)

  // Smena compare
  const loadSmena = useCallback(async (from: string, to: string) => {
    setLoadingS(true)
    try {
      const res = await fetch(`/api/analytics/smena-compare?from=${from}&to=${to}`)
      if (res.ok) setSmena(await res.json())
    } finally { setLoadingS(false) }
  }, [])

  // Trend
  const loadTrend = useCallback(async (from: string, to: string) => {
    setLoadingT(true)
    try {
      const res = await fetch(`/api/analytics/trend?from=${from}&to=${to}`)
      if (res.ok) setTrend(await res.json())
    } finally { setLoadingT(false) }
  }, [])

  useEffect(() => {
    loadSmena(period.from, period.to)
    loadTrend(period.from, period.to)
  }, [period, loadSmena, loadTrend])

  const loading = loadingS || loadingT

  // ── Chart data ───────────────────────────────────────────────────────────────
  const smenaBarData = smena
    ? (['A','B','D'] as const).map(s => ({
        smena:    `${s} Smena`,
        DRL:      smena.drl[s]?.total      ?? 0,
        'DRL D':  smena.drl[s]?.damas      ?? 0,
        'DRL L':  smena.drl[s]?.labo       ?? 0,
        'GCA WDPV': smena.gca[s]?.wdpv    ?? 0,
      }))
    : []

  const shopDrlData = smena
    ? Object.values(
        (['A','B','D'] as const).reduce((acc, s) => {
          for (const row of smena.drl[s].byShop) {
            if (!acc[row.shop]) acc[row.shop] = { shop: row.shop, A: 0, B: 0, D: 0 }
            acc[row.shop][s] = row.total
          }
          return acc
        }, {} as Record<string, any>)
      )
    : []

  const shopGcaData = smena
    ? Object.values(
        (['A','B','D'] as const).reduce((acc, s) => {
          for (const row of smena.gca[s].byShop) {
            if (!acc[row.shop]) acc[row.shop] = { shop: row.shop, A: 0, B: 0, D: 0 }
            acc[row.shop][s] = row.wdpv
          }
          return acc
        }, {} as Record<string, any>)
      )
    : []

  const trendChartData = (trend?.monthly ?? []).map(m => ({
    ...m,
    label: fmtMonth(m.month),
  }))

  // DRL shop trend (stacked by shop per month)
  const shopTrendData = trend
    ? (trend.monthly ?? []).map(m => {
        const row: Record<string, any> = { label: fmtMonth(m.month), month: m.month }
        for (const [shop, pts] of Object.entries(trend.shopMonthly)) {
          const pt = pts.find(p => p.month === m.month)
          row[shop] = pt?.total ?? 0
        }
        return row
      })
    : []

  const knownShops = trend ? Object.keys(trend.shopMonthly) : []

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Analitika"
        description="Sehlar · Smenalar · Oylik trend — DRL / DRR / GCA taqqoslash"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Rahbar paneli', href: '/dashboard/manager' },
          { label: 'Analitika' },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Link href="/dashboard/manager">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Orqaga
            </button>
          </Link>

          {/* Period picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <input
                type="date" value={period.from}
                onChange={e => setPeriod(p => ({ ...p, from: e.target.value }))}
                className="bg-transparent text-sm text-foreground outline-none"
              />
              <span className="text-muted-foreground text-sm">—</span>
              <input
                type="date" value={period.to}
                onChange={e => setPeriod(p => ({ ...p, to: e.target.value }))}
                className="bg-transparent text-sm text-foreground outline-none"
              />
            </div>
            <button
              onClick={() => { loadSmena(period.from, period.to); loadTrend(period.from, period.to) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1 w-fit">
          {([
            { key: 'sehlar',   label: 'Sehlar',   icon: <Building2 className="w-3.5 h-3.5" /> },
            { key: 'smenalar', label: 'Smenalar',  icon: <Layers className="w-3.5 h-3.5" /> },
            { key: 'trend',    label: 'Oylik Trend', icon: <BarChart2 className="w-3.5 h-3.5" /> },
          ] as { key: typeof activeTab; label: string; icon: React.ReactNode }[]).map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && (
          <>
            {/* ═══════════════════════════════════════════════════════════
                TAB 1 — SEHLAR kesimida
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'sehlar' && smena && (
              <div className="space-y-8">

                {/* DRL by shop (A vs B vs D grouped bar) */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                        DRL — Sehlar va Smenalar kesimida
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Har bir sehning A/B/D smena nuqsonlari</p>
                    </div>
                    <Link href="/dashboard/drl" className="text-xs text-yellow-400 hover:underline">DRL →</Link>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={shopDrlData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                      <XAxis dataKey="shop" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="A" name="A Smena" fill={SHIFT_COLORS.A} radius={[3,3,0,0]} />
                      <Bar dataKey="B" name="B Smena" fill={SHIFT_COLORS.B} radius={[3,3,0,0]} />
                      <Bar dataKey="D" name="D Smena" fill={SHIFT_COLORS.D} radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* DRR by shop */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-orange-400" />
                        DRR — Sehlar kesimida
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Jami: {smena.drr.total.toLocaleString()} nuqson · {smena.drr.veh_total.toLocaleString()} mashina</p>
                    </div>
                    <Link href="/dashboard/drr" className="text-xs text-orange-400 hover:underline">DRR →</Link>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={smena.drr.byShop} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                      <XAxis dataKey="shop" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="total" name="Nuqsonlar" radius={[4,4,0,0]}>
                        {smena.drr.byShop.map(s => (
                          <Cell key={s.shop} fill={SHOP_HEX[s.shop] ?? '#6b7280'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* GCA WDPV by shop (A vs B vs D) */}
                {shopGcaData.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-400" />
                          GCA WDPV — Sehlar va Smenalar kesimida
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Avtomobil boshiga nuqson og'irligi</p>
                      </div>
                      <Link href="/dashboard/gca" className="text-xs text-indigo-400 hover:underline">GCA →</Link>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={shopGcaData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                        <XAxis dataKey="shop" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="A" name="A Smena" fill={SHIFT_COLORS.A} radius={[3,3,0,0]} />
                        <Bar dataKey="B" name="B Smena" fill={SHIFT_COLORS.B} radius={[3,3,0,0]} />
                        <Bar dataKey="D" name="D Smena" fill={SHIFT_COLORS.D} radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 2 — SMENALAR kesimida
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'smenalar' && smena && (
              <div className="space-y-6">

                {/* KPI cards A / B / D */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['A','B','D'] as const).map(s => {
                    const d = smena.drl[s]
                    const g = smena.gca[s]
                    const dominant = d.byShop.length > 0 ? d.byShop[0] : null
                    return (
                      <div key={s} className={`rounded-2xl border p-5 space-y-4 ${SHIFT_BG[s]}`}>
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black">{s} Smena</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold border"
                            style={{ background: `${SHIFT_COLORS[s]}20`, borderColor: `${SHIFT_COLORS[s]}40`, color: SHIFT_COLORS[s] }}>
                            GSIP
                          </span>
                        </div>

                        {/* DRL */}
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">DRL</p>
                          <p className="text-3xl font-black">{d.total.toLocaleString()}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3 text-blue-300" /> {d.damas.toLocaleString()} DAMAS
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3 text-green-300" /> {d.labo.toLocaleString()} LABO
                            </span>
                          </div>
                        </div>

                        {/* GCA WDPV */}
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">GCA WDPV</p>
                          <p className="text-2xl font-bold">
                            {g.wdpv > 0 ? g.wdpv.toFixed(2) : '—'}
                          </p>
                          {g.veh_count > 0 && (
                            <p className="text-xs text-muted-foreground">{g.veh_count.toLocaleString()} mashina</p>
                          )}
                        </div>

                        {/* Top shop */}
                        {dominant && (
                          <div className="border-t border-white/10 pt-3">
                            <p className="text-xs text-muted-foreground mb-1">Eng ko&apos;p nuqson:</p>
                            <span className="text-sm font-bold">{dominant.shop}</span>
                            <span className="text-xs text-muted-foreground ml-2">({dominant.total.toLocaleString()})</span>
                          </div>
                        )}

                        {/* Top 5 faults */}
                        {d.top5.length > 0 && (
                          <div className="border-t border-white/10 pt-3 space-y-1.5">
                            <p className="text-xs text-muted-foreground font-semibold">Top nuqsonlar:</p>
                            {d.top5.map((f, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-xs font-mono opacity-70 w-12 truncate">{f.fault_code !== '—' ? f.fault_code : ''}</span>
                                <span className="text-xs flex-1 truncate">{f.fault_name}</span>
                                <span className="text-xs font-bold">{f.total}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* DRL smena comparison bar chart */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                    DRL — Smenalar taqqoslash
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={smenaBarData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                      <XAxis dataKey="smena" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="DRL D" name="DAMAS" stackId="drl" fill="#3b82f6" />
                      <Bar dataKey="DRL L" name="LABO"  stackId="drl" fill="#10b981" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* GCA WDPV smena comparison */}
                {smenaBarData.some(d => d['GCA WDPV'] > 0) && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      GCA WDPV — Smenalar taqqoslash
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={smenaBarData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                        <XAxis dataKey="smena" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTip />} />
                        <Bar dataKey="GCA WDPV" name="WDPV" radius={[4,4,0,0]}>
                          {smenaBarData.map(d => (
                            <Cell key={d.smena} fill={SHIFT_COLORS[d.smena[0]] ?? '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* DRR breakdown (no shift for now) */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-orange-400" />
                      DRR — Umumiy (smena bo&apos;yicha ma&apos;lumot mavjud emas)
                    </h2>
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-400">{smena.drr.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">jami nuqson</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {smena.drr.byShop.map(s => (
                      <div key={s.shop} className="bg-muted/20 border border-border rounded-xl p-3">
                        <p className="text-xs text-muted-foreground font-semibold uppercase truncate">{s.shop}</p>
                        <p className="text-xl font-bold text-foreground mt-1">{s.total.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{s.veh_total} mashina</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB 3 — OYLIK TREND
            ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'trend' && trend && (
              <div className="space-y-8">

                {/* DRL + DRR monthly line chart */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-primary" />
                        DRL va DRR — Oylik trend
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Oylar bo&apos;yicha umumiy nuqsonlar soni</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trendChartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="drl" name="DRL" stroke="#eab308" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="drr" name="DRR" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* DRL DAMAS vs LABO monthly */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Car className="w-4 h-4 text-yellow-400" />
                    DRL — DAMAS va LABO modellari oylik trend
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={trendChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="drl_damas" name="DAMAS"  stackId="a" fill="#3b82f6" />
                      <Bar dataKey="drl_labo"  name="LABO"   stackId="a" fill="#10b981" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* GCA WDPV monthly line */}
                {trendChartData.some(d => d.gca_wdpv > 0) && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      GCA WDPV — Oylik trend
                    </h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={trendChartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTip />} />
                        <Line type="monotone" dataKey="gca_wdpv" name="WDPV" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* DRL by shop — oylik stacked bar */}
                {shopTrendData.length > 0 && knownShops.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-yellow-400" />
                      DRL — Sehlar bo&apos;yicha oylik trend
                    </h2>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={shopTrendData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTip />} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {knownShops.map((shop, i) => (
                          <Bar
                            key={shop} dataKey={shop} name={shop}
                            stackId="s" fill={SHOP_HEX[shop] ?? `hsl(${i*60},60%,55%)`}
                            radius={i === knownShops.length - 1 ? [4,4,0,0] : undefined}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Monthly summary table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/20">
                    <h2 className="text-sm font-bold text-foreground">Oylik jadval</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/10">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Oy</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-400">DRL</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-blue-400">DAMAS</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-green-400">LABO</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-orange-400">DRR</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-indigo-400">GCA WDPV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {trendChartData.map(row => (
                          <tr key={row.month} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">{row.label} {row.month?.slice(0,4)}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-yellow-400">{row.drl ? row.drl.toLocaleString() : '—'}</td>
                            <td className="px-4 py-3 text-right text-sm text-blue-300">{row.drl_damas ? row.drl_damas.toLocaleString() : '—'}</td>
                            <td className="px-4 py-3 text-right text-sm text-green-300">{row.drl_labo ? row.drl_labo.toLocaleString() : '—'}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-orange-400">{row.drr ? row.drr.toLocaleString() : '—'}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-indigo-400">{row.gca_wdpv > 0 ? row.gca_wdpv.toFixed(2) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

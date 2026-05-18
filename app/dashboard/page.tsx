'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA } from '@/lib/gca-context'
import { useQRecords } from '@/lib/qrecords-context'
import { useDRecords } from '@/lib/d-records-context'
import { useIncoming } from '@/lib/incoming-context'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  Loader2, Activity, Zap, Factory, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  // Returns MM-DD from YYYY-MM-DD
  return iso.slice(5, 10)
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function yesterdayIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function last7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

const SHOPS = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const

const SHOP_COLORS: Record<string, string> = {
  'PRESS SHOP': '#6366f1',
  'WELDING-1':  '#f59e0b',
  'WELDING-2':  '#ef4444',
  'PAINT SHOP': '#10b981',
  'GA':         '#3b82f6',
}

const DAY_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#818cf8','#60a5fa','#34d399','#f59e0b']

// ─── Sub-components ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'good' | 'warning' | 'critical' }) {
  const cls =
    status === 'good'
      ? 'bg-green-500'
      : status === 'critical'
      ? 'bg-red-500'
      : 'bg-yellow-500'
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />
}

function KPICard({
  title,
  value,
  unit,
  change,
  trend,
  status,
  href,
  format = 'percent',
}: {
  title: string
  value: number
  unit: string
  change: number
  trend: 'up' | 'down' | 'neutral'
  status: 'good' | 'warning' | 'critical'
  href: string
  format?: 'percent' | 'number'
}) {
  const borderCls =
    status === 'good'
      ? 'border-green-500/40'
      : status === 'critical'
      ? 'border-red-500/40'
      : 'border-yellow-500/40'

  const bgCls =
    status === 'good'
      ? 'bg-green-500/5'
      : status === 'critical'
      ? 'bg-red-500/5'
      : 'bg-yellow-500/5'

  const trendColor =
    trend === 'up'
      ? 'text-green-500'
      : trend === 'down'
      ? 'text-red-500'
      : 'text-muted-foreground'

  const displayValue =
    format === 'percent' ? value.toFixed(1) : Math.round(value).toString()

  return (
    <Link href={href} className="block">
      <div
        className={`relative rounded-xl border-2 ${borderCls} ${bgCls} bg-card p-5 hover:shadow-lg transition-all group cursor-pointer`}
      >
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          {title}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold text-foreground">{displayValue}</span>
            <span className="text-sm text-muted-foreground ml-1">{unit}</span>
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        </div>
        <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function DashboardHome() {
  const { records: gcaRecords, loading: gcaLoading, refresh: gcaRefresh, getTotalDefects } = useGCA()
  const { records: qRecords,   loading: qLoading,   refresh: qRefresh }   = useQRecords()
  const { records: dRecords,   loading: dLoading,   refresh: dRefresh,   getTotalDefects: getDTotal } = useDRecords()
  const { records: incomingRecords, loading: incomingLoading, refresh: incomingRefresh } = useIncoming()

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const isLoading = gcaLoading || qLoading || dLoading || incomingLoading

  // ── Refresh all ────────────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([gcaRefresh(), qRefresh(), dRefresh(), incomingRefresh()])
    setLastUpdated(new Date())
    setRefreshing(false)
  }, [gcaRefresh, qRefresh, dRefresh, incomingRefresh])

  // Set initial last-updated time once data loads
  useEffect(() => {
    if (!isLoading && lastUpdated === null) {
      setLastUpdated(new Date())
    }
  }, [isLoading, lastUpdated])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      refreshAll()
    }, 30_000)
    return () => clearInterval(id)
  }, [refreshAll])

  // ── KPI calculations ───────────────────────────────────────────────────────────
  const gcaTotalCount = useMemo(() => getTotalDefects(), [gcaRecords])
  const dTotal        = useMemo(() => getDTotal(), [dRecords])

  const drrCount      = useMemo(() => qRecords.filter(r => r.type === 'drr').reduce((s, r) => s + r.count, 0), [qRecords])
  const drlCount      = useMemo(() => qRecords.filter(r => r.type === 'drl').reduce((s, r) => s + r.count, 0), [qRecords])
  const pdiCount      = useMemo(() => qRecords.filter(r => r.type === 'pdi').reduce((s, r) => s + r.count, 0), [qRecords])
  const incomingTotal = useMemo(() => incomingRecords.reduce((s, r) => s + r.defectCount, 0), [incomingRecords])

  const gcaScore = useMemo(() => Math.max(80, 100 - gcaTotalCount / 10), [gcaTotalCount])
  const ftqScore = useMemo(() => Math.max(80, 100 - (gcaTotalCount + dTotal) / 20), [gcaTotalCount, dTotal])
  const cmmScore = useMemo(() => Math.max(85, 100 - gcaTotalCount / 15), [gcaTotalCount])

  // Yesterday counts for trend arrows (compare today vs yesterday by date field)
  const today     = todayIso()
  const yesterday = yesterdayIso()

  const gcaTodayCount     = useMemo(() => gcaRecords.filter(r => r.date === today).reduce((s, r) => s + r.count, 0), [gcaRecords, today])
  const gcaYesterdayCount = useMemo(() => gcaRecords.filter(r => r.date === yesterday).reduce((s, r) => s + r.count, 0), [gcaRecords, yesterday])

  function trendVsYesterday(todayVal: number, yestVal: number): { trend: 'up' | 'down' | 'neutral'; change: number } {
    if (yestVal === 0) return { trend: 'neutral', change: 0 }
    const pct = ((todayVal - yestVal) / yestVal) * 100
    return { trend: pct >= 0 ? 'up' : 'down', change: Math.abs(pct) }
  }

  const gcaTrend = trendVsYesterday(gcaTodayCount, gcaYesterdayCount)

  // ── Top defects from GCA records ──────────────────────────────────────────────
  const topDefects = useMemo(() => {
    const map: Record<string, { code: string; codeName: string; shop: string; count: number }> = {}
    for (const r of gcaRecords) {
      const key = `${r.code}::${r.codeName}`
      if (!map[key]) map[key] = { code: r.code, codeName: r.codeName, shop: r.shop, count: 0 }
      map[key].count += r.count
    }
    const sorted = Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8)
    const total = sorted.reduce((s, d) => s + d.count, 0) || 1
    return sorted.map((d, i) => ({ ...d, rank: i + 1, pct: ((d.count / total) * 100).toFixed(1) }))
  }, [gcaRecords])

  // ── Smena performance ─────────────────────────────────────────────────────────
  const smenaStats = useMemo(() => {
    return (['A', 'B', 'D'] as const).map(shift => {
      const gcaShift = gcaRecords.filter(r => {
        // GCARecord has no shift field — we use qRecords for shift info
        return false
      })
      // Count defects per shift from qRecords (all types) + use gca records date-matched to qrecords shift info
      const qShift   = qRecords.filter(r => r.shift === shift)
      const totalDef = qShift.reduce((s, r) => s + r.count, 0)

      // Top defect code in this shift
      const codeMap: Record<string, number> = {}
      for (const r of qShift) {
        codeMap[r.code] = (codeMap[r.code] || 0) + r.count
      }
      const topCode = Object.entries(codeMap).sort((a, b) => b[1] - a[1])[0]

      const status: 'good' | 'warning' | 'critical' =
        totalDef === 0    ? 'good'
        : totalDef < 10  ? 'good'
        : totalDef <= 30 ? 'warning'
        : 'critical'

      return {
        shift,
        label: `${shift} smena`,
        totalDef,
        topCode: topCode ? `${topCode[0]} (${topCode[1]} ta)` : '—',
        status,
      }
    })
  }, [qRecords])

  // ── Shop ranking ──────────────────────────────────────────────────────────────
  const shopRanking = useMemo(() => {
    const byShop: Record<string, number> = {}
    for (const shop of SHOPS) byShop[shop] = 0

    for (const r of gcaRecords) byShop[r.shop] = (byShop[r.shop] || 0) + r.count
    for (const r of qRecords)   byShop[r.shop] = (byShop[r.shop] || 0) + r.count

    return SHOPS
      .map(shop => ({ shop, count: byShop[shop] || 0 }))
      .sort((a, b) => a.count - b.count)
      .map((s, i) => ({ ...s, rank: i + 1 }))
  }, [gcaRecords, qRecords])

  // ── Last 7 days trend chart ───────────────────────────────────────────────────
  const trendChartData = useMemo(() => {
    const days = last7Days()
    return days.map((day, i) => {
      const count = gcaRecords.filter(r => r.date === day).reduce((s, r) => s + r.count, 0)
      return { date: fmtDate(day), count, color: DAY_COLORS[i % DAY_COLORS.length] }
    })
  }, [gcaRecords])

  // ── Shop breakdown chart ──────────────────────────────────────────────────────
  const shopChartData = useMemo(() => {
    const byShop: Record<string, number> = {}
    for (const shop of SHOPS) byShop[shop] = 0
    for (const r of gcaRecords) byShop[r.shop] = (byShop[r.shop] || 0) + r.count
    return SHOPS.map(shop => ({ shop: shop.replace(' ', '\n'), fullShop: shop, count: byShop[shop] || 0 }))
  }, [gcaRecords])

  // ── Status helpers ────────────────────────────────────────────────────────────
  function smenaStatusCls(status: 'good' | 'warning' | 'critical') {
    return status === 'good'
      ? 'border-green-500/40 bg-green-500/5'
      : status === 'critical'
      ? 'border-red-500/40 bg-red-500/5'
      : 'border-yellow-500/40 bg-yellow-500/5'
  }

  function smenaStatusLabel(status: 'good' | 'warning' | 'critical') {
    return status === 'good' ? 'Yaxshi' : status === 'critical' ? 'Kritik' : 'Ogohlantirish'
  }

  function smenaStatusBadgeCls(status: 'good' | 'warning' | 'critical') {
    return status === 'good'
      ? 'bg-green-500/20 text-green-400'
      : status === 'critical'
      ? 'bg-red-500/20 text-red-400'
      : 'bg-yellow-500/20 text-yellow-400'
  }

  // ─────────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Ma&apos;lumotlar yuklanmoqda…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <PageHeader
        title="Bosh sahifa"
        description="UzAuto Motors ishlab chiqarish sifat kontroli — Real-vaqt ko'rsatkichlar"
        actions={
          <div className="flex items-center gap-3">
            {/* Live badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium text-foreground">Jonli</span>
              {lastUpdated && (
                <span className="text-muted-foreground" suppressHydrationWarning>
                  {lastUpdated.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={refreshAll}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Yangilash
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-8">

        {/* ── Row 1: KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="GCA Sifat Bali"
            value={gcaScore}
            unit="%"
            change={gcaTrend.change}
            trend={gcaTrend.trend === 'up' ? 'down' : gcaTrend.trend === 'down' ? 'up' : 'neutral'}
            status={gcaScore >= 95 ? 'good' : gcaScore >= 88 ? 'warning' : 'critical'}
            href="/dashboard/gca"
          />
          <KPICard
            title="DRR Nuqsonlar"
            value={drrCount}
            unit="ta"
            change={0}
            trend="neutral"
            status={drrCount === 0 ? 'good' : drrCount < 20 ? 'warning' : 'critical'}
            href="/dashboard/drr"
            format="number"
          />
          <KPICard
            title="DRL Nuqsonlar"
            value={drlCount}
            unit="ta"
            change={0}
            trend="neutral"
            status={drlCount === 0 ? 'good' : drlCount < 20 ? 'warning' : 'critical'}
            href="/dashboard/drl"
            format="number"
          />
          <KPICard
            title="FTQ Ko'rsatkichi"
            value={ftqScore}
            unit="%"
            change={0}
            trend="neutral"
            status={ftqScore >= 95 ? 'good' : ftqScore >= 88 ? 'warning' : 'critical'}
            href="/dashboard/kpi/ftq"
          />
        </div>

        {/* ── Row 2: Secondary KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="CMM Ko'rsatkichi"
            value={cmmScore}
            unit="%"
            change={0}
            trend="neutral"
            status={cmmScore >= 95 ? 'good' : cmmScore >= 88 ? 'warning' : 'critical'}
            href="/dashboard/cmm"
          />
          <KPICard
            title="PDI Nuqsonlar"
            value={pdiCount}
            unit="ta"
            change={0}
            trend="neutral"
            status={pdiCount === 0 ? 'good' : pdiCount < 15 ? 'warning' : 'critical'}
            href="/dashboard/pdi"
            format="number"
          />
          <KPICard
            title="Payvandlash (D)"
            value={dTotal}
            unit="ta"
            change={0}
            trend="neutral"
            status={dTotal === 0 ? 'good' : dTotal < 20 ? 'warning' : 'critical'}
            href="/dashboard/d10"
            format="number"
          />
          <KPICard
            title="Kiruvchi Nuqsonlar"
            value={incomingTotal}
            unit="ta"
            change={0}
            trend="neutral"
            status={incomingTotal === 0 ? 'good' : incomingTotal < 10 ? 'warning' : 'critical'}
            href="/dashboard/incoming"
            format="number"
          />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Last 7 days trend */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">So&apos;nggi 7 kun GCA trendi</h2>
            </div>
            {trendChartData.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Ma&apos;lumot yo&apos;q
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--foreground))',
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                    formatter={(v: number) => [`${v} ta`, 'Nuqsonlar']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {trendChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Shop breakdown */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Factory className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Sexlar bo&apos;yicha GCA nuqsonlar</h2>
            </div>
            {shopChartData.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Ma&apos;lumot yo&apos;q
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={shopChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="shop"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--foreground))',
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                    formatter={(v: number) => [`${v} ta`, 'Nuqsonlar']}
                    labelFormatter={(label: string) => label.replace('\n', ' ')}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {shopChartData.map((entry, index) => (
                      <Cell key={index} fill={SHOP_COLORS[entry.fullShop] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Top defects + Smena performance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Top defects list */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Eng ko&apos;p uchraydigan nuqsonlar
              </h2>
              <Link href="/dashboard/gca">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  Barchasi <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {topDefects.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nuqsonlar topilmadi
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {topDefects.map(defect => {
                  const barWidth = Math.max(4, Math.round((defect.count / (topDefects[0]?.count || 1)) * 100))
                  const isCritical = defect.rank <= 3
                  return (
                    <div
                      key={`${defect.code}-${defect.codeName}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:border-primary/50 ${
                        isCritical
                          ? 'bg-red-500/5 border-red-500/20'
                          : 'bg-yellow-500/5 border-yellow-500/20'
                      }`}
                    >
                      {/* Rank badge */}
                      <div
                        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCritical
                            ? 'bg-red-500 text-white'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {defect.rank}
                      </div>

                      {/* Code + name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs text-foreground font-mono">{defect.code}</span>
                          <span className="text-xs text-muted-foreground truncate">{defect.codeName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{defect.shop}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-muted-foreground text-xs">—</span>
                          {/* Count bar */}
                          <div className="flex-1 bg-border/40 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : 'bg-primary'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Count + pct */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm text-foreground">{defect.count}</p>
                        <p className="text-xs text-muted-foreground">{defect.pct}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Smena performance */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Smenalar samaradorligi
            </h2>
            {smenaStats.map(s => (
              <div
                key={s.shift}
                className={`p-4 rounded-xl border-2 transition-all ${smenaStatusCls(s.status)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StatusDot status={s.status} />
                    <h3 className="font-bold text-foreground">{s.label}</h3>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${smenaStatusBadgeCls(s.status)}`}>
                    {smenaStatusLabel(s.status)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Jami nuqsonlar</span>
                    <span className="font-bold text-foreground text-sm">{s.totalDef}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground flex-shrink-0">Asosiy nuqson</span>
                    <span className="text-xs text-foreground text-right truncate max-w-[140px]">{s.topCode}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Shop ranking ── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Sex reytingi (nuqsonlar bo&apos;yicha)
            </h2>
            <span className="text-xs text-muted-foreground">Kamroq = yaxshiroq</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {shopRanking.map(s => {
              const isTop = s.rank === 1
              const isLast = s.rank === shopRanking.length
              return (
                <div
                  key={s.shop}
                  className={`relative rounded-lg border p-4 text-center transition-all ${
                    isTop
                      ? 'border-green-500/40 bg-green-500/5'
                      : isLast
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div
                    className={`text-lg font-black mb-1 ${
                      isTop ? 'text-green-500' : isLast ? 'text-red-500' : 'text-muted-foreground'
                    }`}
                  >
                    #{s.rank}
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight mb-2">{s.shop}</p>
                  <p className="text-2xl font-bold text-foreground">{s.count}</p>
                  <p className="text-xs text-muted-foreground">nuqson</p>
                  {isTop && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">🏆</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Quick links ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/analytics"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <Activity className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-sm text-foreground">Analitika</p>
            <p className="text-xs text-muted-foreground mt-0.5">Statistika va grafik</p>
          </Link>
          <Link
            href="/dashboard/gca"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <Zap className="w-6 h-6 text-yellow-500 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-sm text-foreground">GCA Dashboard</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sifat nazorati</p>
          </Link>
          <Link
            href="/dashboard/reports"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <TrendingUp className="w-6 h-6 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-sm text-foreground">Rahbar paneli</p>
            <p className="text-xs text-muted-foreground mt-0.5">Boshqaruv hisoboti</p>
          </Link>
          <Link
            href="/dashboard/settings"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <Factory className="w-6 h-6 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-sm text-foreground">Sozlamalar</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tizim sozlamalari</p>
          </Link>
        </div>

      </div>
    </div>
  )
}

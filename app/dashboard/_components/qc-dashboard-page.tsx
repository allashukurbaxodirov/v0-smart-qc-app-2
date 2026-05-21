'use client'

import { useState, useMemo, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useQRecords, QRecordType } from '@/lib/qrecords-context'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  BarChart,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Activity, Target, BarChart3, RefreshCw, ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

// ─── Config ───────────────────────────────────────────────────────────────────
export interface QcDashConfig {
  type:        QRecordType
  title:       string
  description: string
  entryHref:   string
  entryLabel:  string
  breadParent: string
}

const SHOPS = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const
const SHOP_SHORT: Record<string, string> = {
  'PRESS SHOP': 'PRESS', 'WELDING-1': 'WELD-1',
  'WELDING-2': 'WELD-2', 'PAINT SHOP': 'PAINT', 'GA': 'GA',
}

function getRiskBadgeClass(factor: number) {
  if (factor >= 50) return 'bg-critical text-white'
  if (factor >= 20) return 'bg-warning text-white'
  if (factor >= 10) return 'bg-blue-500 text-white'
  return 'bg-success text-white'
}
function getRiskLabel(factor: number) {
  if (factor >= 50) return 'Kritik'
  if (factor >= 20) return "O'rtacha"
  if (factor >= 10) return 'Past'
  return 'Minimal'
}

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-card, #1e1e2e)',
      border: '1px solid rgba(128,128,128,0.25)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ opacity: 0.7 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function QcDashboardPage({ cfg }: { cfg: QcDashConfig }) {
  const { records: all, loading, refresh } = useQRecords()
  const records = useMemo(() => all.filter(r => r.type === cfg.type), [all, cfg.type])
  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'factor' | 'count'>('factor')
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => refresh(), 30000)
    return () => clearInterval(t)
  }, [autoRefresh, refresh])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const todayRecs   = records.filter(r => r.date === today)
  const totalCount  = records.reduce((s, r) => s + r.count, 0)
  const todayCount  = todayRecs.reduce((s, r) => s + r.count, 0)
  const criticalCnt = records.filter(r => r.factor >= 50).reduce((s, r) => s + r.count, 0)
  const overShops   = SHOPS.filter(sh => records.filter(r => r.shop === sh).reduce((s, r) => s + r.count, 0) > 0).length

  // ── Chart: shop comparison ─────────────────────────────────────────────────
  const shopChartData = SHOPS.map(sh => ({
    shop:   SHOP_SHORT[sh],
    shopFull: sh,
    count:  records.filter(r => r.shop === sh).reduce((s, r) => s + r.count, 0),
    today:  todayRecs.filter(r => r.shop === sh).reduce((s, r) => s + r.count, 0),
  }))

  // ── Chart: last 7 days ─────────────────────────────────────────────────────
  const days = last7Days()
  const trendData = days.map(d => ({
    date: d.slice(5),
    count: records.filter(r => r.date === d).reduce((s, r) => s + r.count, 0),
    critical: records.filter(r => r.date === d && r.factor >= 50).reduce((s, r) => s + r.count, 0),
  }))

  // ── Shop detail ────────────────────────────────────────────────────────────
  const getShopDefects = (shop: string) => {
    const merged: { code: string; name: string; count: number; factor: number }[] = []
    records.filter(r => r.shop === shop).forEach(r => {
      const ex = merged.find(m => m.code === r.code && m.factor === r.factor)
      if (ex) ex.count += r.count
      else merged.push({ code: r.code, name: r.codeName, count: r.count, factor: r.factor })
    })
    return sortBy === 'factor'
      ? merged.sort((a, b) => b.factor - a.factor)
      : merged.sort((a, b) => b.count - a.count)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHOP DETAIL VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (selectedShop) {
    const defects    = getShopDefects(selectedShop)
    const totalShop  = defects.reduce((s, d) => s + d.count, 0)
    const f50 = defects.filter(d => d.factor === 50)
    const f20 = defects.filter(d => d.factor === 20)
    const f10 = defects.filter(d => d.factor === 10)
    const f5  = defects.filter(d => d.factor === 5)

    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title={`${cfg.title} — ${selectedShop}`}
          description="Sehdagi nuqsonlar tahlili • Faktor bo'yicha taqsimot"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: cfg.breadParent, href: `/dashboard/${cfg.type}-admin` },
            { label: selectedShop },
          ]}
        />
        <div className="p-6 space-y-6">
          <button
            onClick={() => setSelectedShop(null)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            {cfg.breadParent} ga qaytish
          </button>

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Jami nuqsonlar</p>
              <p className="text-3xl font-bold text-foreground">{totalShop}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Kritik (F-50)</p>
              <p className={`text-3xl font-bold ${f50.length > 0 ? 'text-critical' : 'text-success'}`}>
                {f50.reduce((s, d) => s + d.count, 0)}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Nuqson turlari</p>
              <p className="text-3xl font-bold text-foreground">{defects.length}</p>
            </div>
            <div className={`border-2 rounded-xl p-5 flex items-center gap-3 ${
              f50.length > 0 ? 'border-critical bg-critical/5' : 'border-success bg-success/5'
            }`}>
              {f50.length > 0
                ? <AlertTriangle className="w-8 h-8 text-critical" />
                : <CheckCircle className="w-8 h-8 text-success" />}
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`text-sm font-bold ${f50.length > 0 ? 'text-critical' : 'text-success'}`}>
                  {f50.length > 0 ? 'Kritik nuqson bor' : 'Kritik yo\'q'}
                </p>
              </div>
            </div>
          </div>

          {/* Factor buckets */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { label: 'Faktor 50', data: f50, border: 'border-critical', bg: 'bg-critical/5', text: 'text-critical' },
              { label: 'Faktor 20', data: f20, border: 'border-warning',  bg: 'bg-warning/5',  text: 'text-warning'  },
              { label: 'Faktor 10', data: f10, border: 'border-blue-500', bg: 'bg-blue-500/5', text: 'text-blue-500' },
              { label: 'Faktor 5',  data: f5,  border: 'border-success',  bg: 'bg-success/5',  text: 'text-success'  },
            ] as const).map(({ label, data, border, bg, text }) => (
              <div key={label} className={`border-2 ${border} ${bg} rounded-xl p-4`}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                <p className={`text-2xl font-bold ${text}`}>{data.reduce((s, d) => s + d.count, 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{data.length} tur nuqson</p>
              </div>
            ))}
          </div>

          {/* Sort + table */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-foreground">Nuqsonlar ro'yxati</h2>
            <div className="inline-flex bg-card border border-border rounded-lg p-1 gap-1">
              {(['factor', 'count'] as const).map(key => (
                <button key={key} onClick={() => setSortBy(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    sortBy === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {key === 'factor' ? "Faktor bo'yicha" : "Soni bo'yicha"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Kod','Nuqson nomi','Soni','Faktor','Xavflilik'].map(h => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold text-muted-foreground ${h==='Kod'||h==='Nuqson nomi'?'text-left':'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {defects.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Bu sehda nuqson yo'q</td></tr>
                  ) : defects.map((d, i) => (
                    <tr key={`${d.code}-${i}`}
                      className={`transition-colors hover:bg-muted/30 ${d.factor===50?'bg-critical/5':d.factor===20?'bg-warning/5':''}`}>
                      <td className="px-5 py-3 font-bold text-foreground">{d.code}</td>
                      <td className="px-5 py-3 text-sm text-foreground">{d.name}</td>
                      <td className="px-5 py-3 text-right font-semibold text-foreground">{d.count}</td>
                      <td className="px-5 py-3 text-right font-bold text-lg text-foreground">{d.factor}</td>
                      <td className="px-5 py-3 text-right">
                        <Badge className={getRiskBadgeClass(d.factor)}>{getRiskLabel(d.factor)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: cfg.breadParent }]}
      />

      <div className="p-6 space-y-6">

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { refresh() }}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
            <button
              onClick={() => setAutoRefresh(p => !p)}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                autoRefresh
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-card text-muted-foreground border-border'
              }`}
            >
              {autoRefresh ? '● Auto 30s' : '○ Manual'}
            </button>
          </div>
          <Link href={cfg.entryHref}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            {cfg.entryLabel}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`border-2 rounded-xl p-5 ${todayCount > 0 ? 'border-warning bg-warning/5' : 'border-success bg-success/5'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">BUGUN</p>
              <Activity className={`w-4 h-4 ${todayCount > 0 ? 'text-warning' : 'text-success'}`} />
            </div>
            <p className={`text-3xl font-bold ${todayCount > 0 ? 'text-warning' : 'text-success'}`}>{todayCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{todayRecs.length} ta yozuv</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">JAMI (barcha vaqt)</p>
            <p className="text-3xl font-bold text-foreground">{totalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{records.length} yozuv</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">KRITIK (F-50)</p>
            <p className={`text-3xl font-bold ${criticalCnt > 0 ? 'text-critical' : 'text-success'}`}>{criticalCnt}</p>
            <p className="text-xs text-muted-foreground mt-1">dona</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">FAOL SEHLAR</p>
            <p className="text-3xl font-bold text-foreground">{overShops}</p>
            <p className="text-xs text-muted-foreground mt-1">ta sehda yozuv bor</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Ma'lumotlar yuklanmoqda...
          </div>
        )}

        {!loading && (
          <>
            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Shop comparison */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-base font-bold text-foreground">Sehlar bo'yicha</h2>
                    <p className="text-xs text-muted-foreground">Jami nuqsonlar taqsimoti</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded bg-primary" />Jami
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded bg-warning" />Bugun
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={shopChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
                    <XAxis dataKey="shop" tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Jami" fill="#7c6fcd" radius={[6,6,0,0]} maxBarSize={50} />
                    <Bar dataKey="today" name="Bugun" fill="#d4a017" radius={[6,6,0,0]} maxBarSize={50} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 7 days trend */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-base font-bold text-foreground">So'nggi 7 kun trendi</h2>
                    <p className="text-xs text-muted-foreground">Kunlik nuqsonlar dinamikasi</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Jami" fill="#7c6fcd" radius={[6,6,0,0]} maxBarSize={40} />
                    <Line dataKey="critical" name="Kritik" type="monotone"
                      stroke="#e05c3a" strokeWidth={2} strokeDasharray="5 3"
                      dot={{ fill: '#e05c3a', r: 4, strokeWidth: 0 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Shop cards */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Sehlar bo'yicha — bosib kirish</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {SHOPS.map(shop => {
                  const shopRecs   = records.filter(r => r.shop === shop)
                  const count      = shopRecs.reduce((s, r) => s + r.count, 0)
                  const critical   = shopRecs.filter(r => r.factor >= 50).reduce((s, r) => s + r.count, 0)
                  const todayShop  = todayRecs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
                  const hasCritical = critical > 0

                  return (
                    <button key={shop} onClick={() => setSelectedShop(shop)}
                      className={`group p-5 bg-card border-2 rounded-xl text-left transition-all hover:shadow-xl ${
                        hasCritical
                          ? 'border-critical hover:bg-critical/5'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-foreground text-sm leading-tight">{shop}</h3>
                        {hasCritical
                          ? <AlertTriangle className="w-4 h-4 text-critical flex-shrink-0" />
                          : <Target className="w-4 h-4 text-success flex-shrink-0" />}
                      </div>
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground">Jami nuqson</p>
                        <p className={`text-2xl font-bold ${hasCritical ? 'text-critical' : 'text-foreground'}`}>{count}</p>
                        <p className="text-xs text-muted-foreground">Bugun: {todayShop}</p>
                      </div>
                      <div className="mb-3">
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full transition-all ${hasCritical ? 'bg-critical' : 'bg-success'}`}
                            style={{ width: `${Math.min(100, count > 0 ? 60 + (count / (totalCount || 1)) * 40 : 0)}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{count} nuqson</span>
                        {critical > 0 && <span className="text-critical font-semibold">{critical} kritik</span>}
                      </div>
                      <p className="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        Batafsil →
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Factor summary table */}
            {records.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-base font-bold text-foreground">Faktor bo'yicha umumiy taqsimot</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {['Sehi','Faktor 50','Faktor 20','Faktor 10','Faktor 5','Jami','Bugun','Status'].map(h => (
                          <th key={h} className={`px-5 py-3 text-xs font-semibold text-muted-foreground ${h==='Sehi'?'text-left':'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {SHOPS.map(shop => {
                        const sr   = records.filter(r => r.shop === shop)
                        const f50  = sr.filter(r => r.factor >= 50).reduce((s, r) => s + r.count, 0)
                        const f20  = sr.filter(r => r.factor === 20).reduce((s, r) => s + r.count, 0)
                        const f10  = sr.filter(r => r.factor === 10).reduce((s, r) => s + r.count, 0)
                        const f5   = sr.filter(r => r.factor === 5).reduce((s, r) => s + r.count, 0)
                        const tot  = sr.reduce((s, r) => s + r.count, 0)
                        const tday = todayRecs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
                        return (
                          <tr key={shop} onClick={() => setSelectedShop(shop)}
                            className="hover:bg-muted/30 transition-colors cursor-pointer">
                            <td className="px-5 py-3 font-semibold text-foreground">{shop}</td>
                            <td className="px-5 py-3 text-center">{f50>0?<span className="font-bold text-critical">{f50}</span>:<span className="text-muted-foreground">—</span>}</td>
                            <td className="px-5 py-3 text-center">{f20>0?<span className="font-bold text-warning">{f20}</span>:<span className="text-muted-foreground">—</span>}</td>
                            <td className="px-5 py-3 text-center">{f10>0?<span className="font-bold text-blue-400">{f10}</span>:<span className="text-muted-foreground">—</span>}</td>
                            <td className="px-5 py-3 text-center">{f5>0?<span className="font-bold text-success">{f5}</span>:<span className="text-muted-foreground">—</span>}</td>
                            <td className="px-5 py-3 text-center font-semibold text-foreground">{tot}</td>
                            <td className="px-5 py-3 text-center font-semibold text-foreground">{tday}</td>
                            <td className="px-5 py-3 text-center">
                              <Badge className={f50>0?'bg-critical text-white':'bg-success text-white'}>
                                {f50>0?'Kritik bor':'OK'}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {records.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-12 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm">Hali nuqson kiritilmagan.</p>
                <Link href={cfg.entryHref} className="inline-block mt-4 text-sm text-primary hover:underline">
                  Nuqson kiritish →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA } from '@/lib/gca-context'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  ChevronLeft,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ─── Configuration ────────────────────────────────────────────────────────────
const SHOPS = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const

const WDPV_TARGETS: Record<string, number> = {
  'PLANT':      2.5,
  'PRESS SHOP': 0.40,
  'WELDING-1':  0.45,
  'WELDING-2':  0.45,
  'PAINT SHOP': 0.70,
  'GA':         0.50,
}

const SHOP_SHORT: Record<string, string> = {
  'PRESS SHOP': 'PRESS',
  'WELDING-1':  'WELD-1',
  'WELDING-2':  'WELD-2',
  'PAINT SHOP': 'PAINT',
  'GA':         'GA',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRiskLabel(factor: number) {
  if (factor === 50) return 'Yuqori'
  if (factor === 20) return "O'rtacha"
  if (factor === 10) return 'Past'
  return 'Minimal'
}

function getRiskBadgeClass(factor: number) {
  if (factor === 50) return 'bg-critical text-white'
  if (factor === 20) return 'bg-warning text-white'
  if (factor === 10) return 'bg-blue-500 text-white'
  return 'bg-success text-white'
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--color-card, #1e1e2e)',
        border: '1px solid rgba(128,128,128,0.25)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        color: 'inherit',
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ opacity: 0.7 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GCAPage() {
  const { records, loading } = useGCA()
  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'factor' | 'count'>('factor')
  const [vehicles, setVehicles] = useState(50)
  const [wdpvTargets, setWdpvTargets] = useState({ ...WDPV_TARGETS })

  // SuperAdmin tomonidan o'zgartirilgan targetlarni yuklash
  useEffect(() => {
    const load = () => {
      try {
        const t = localStorage.getItem('gca_wdpv_targets_v1')
        const v = localStorage.getItem('gca_vehicles_v1')
        if (t) setWdpvTargets(prev => ({ ...prev, ...JSON.parse(t) }))
        if (v) setVehicles(Number(v))
      } catch {}
    }
    load()
    window.addEventListener('gca_targets_updated', load)
    return () => window.removeEventListener('gca_targets_updated', load)
  }, [])

  // ── WDPV: faqat real yozuvlardan ──────────────────────────────────────────
  const calcWDPV = (shop: string) => {
    const shopRecords =
      shop === 'PLANT' ? records : records.filter((r) => r.shop === shop)
    const total = shopRecords.reduce((s, r) => s + r.count, 0)
    return vehicles > 0 ? total / vehicles : 0
  }

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const rows = [
      {
        shop: 'PLANT',
        shopFull: 'PLANT',
        actual: parseFloat(calcWDPV('PLANT').toFixed(2)),
        target: wdpvTargets['PLANT'],
      },
      ...SHOPS.map((s) => ({
        shop: SHOP_SHORT[s],
        shopFull: s,
        actual: parseFloat(calcWDPV(s).toFixed(2)),
        target: wdpvTargets[s],
      })),
    ]
    return rows
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, vehicles])

  // ── Defect list for a shop (only real records) ─────────────────────────────
  const getShopDefects = (shop: string) => {
    // Yozuvlarni birlashtir: bir xil kodli yozuvlar qo'shiladi
    const merged: { code: string; name: string; count: number; factor: number }[] = []
    records
      .filter((r) => r.shop === shop)
      .forEach((r) => {
        const existing = merged.find((m) => m.code === r.code && m.factor === r.factor)
        if (existing) {
          existing.count += r.count
        } else {
          merged.push({ code: r.code, name: r.codeName, count: r.count, factor: r.factor })
        }
      })

    return sortBy === 'factor'
      ? merged.sort((a, b) => b.factor - a.factor)
      : merged.sort((a, b) => b.count - a.count)
  }

  // ── Factor buckets (aniq qiymatlar: 50 / 20 / 10 / 5) ────────────────────
  const getFactorBuckets = (defects: ReturnType<typeof getShopDefects>) => ({
    f50: defects.filter((d) => d.factor === 50),
    f20: defects.filter((d) => d.factor === 20),
    f10: defects.filter((d) => d.factor === 10),
    f5:  defects.filter((d) => d.factor === 5),
  })

  // ══════════════════════════════════════════════════════════════════════════
  // SHOP DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedShop) {
    const defects    = getShopDefects(selectedShop)
    const { f50, f20, f10, f5 } = getFactorBuckets(defects)
    const wdpv       = calcWDPV(selectedShop)
    const target     = wdpvTargets[selectedShop] ?? 0.5
    const over       = wdpv > target
    const totalCount = defects.reduce((s, d) => s + d.count, 0)

    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title={`GCA — ${selectedShop}`}
          description="Sehdan kelgan nuqsonlar • WDPV tahlili"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'GCA Daily Board', href: '/dashboard/gca' },
            { label: selectedShop },
          ]}
        />

        <div className="p-6 space-y-6">
          {/* Back */}
          <button
            onClick={() => setSelectedShop(null)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            GCA Daily Board ga qaytish
          </button>

          {/* WDPV KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">WDPV Actual</p>
              <p className={`text-3xl font-bold ${over ? 'text-critical' : 'text-success'}`}>
                {wdpv.toFixed(2)}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">WDPV Target</p>
              <p className="text-3xl font-bold text-primary">{target.toFixed(2)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Jami nuqsonlar</p>
              <p className="text-3xl font-bold text-foreground">{totalCount}</p>
            </div>
            <div className={`border-2 rounded-xl p-5 flex items-center gap-3 ${
              over ? 'border-critical bg-critical/5' : 'border-success bg-success/5'
            }`}>
              {over
                ? <TrendingUp className="w-8 h-8 text-critical" />
                : <CheckCircle className="w-8 h-8 text-success" />
              }
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`text-sm font-bold ${over ? 'text-critical' : 'text-success'}`}>
                  {over ? 'Target oshdi!' : 'Targetda'}
                </p>
              </div>
            </div>
          </div>

          {/* Factor buckets — 50 / 20 / 10 / 5 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { key: 'f50', label: 'Faktor 50', data: f50, border: 'border-critical', bg: 'bg-critical/5', text: 'text-critical' },
              { key: 'f20', label: 'Faktor 20', data: f20, border: 'border-warning',  bg: 'bg-warning/5',  text: 'text-warning'  },
              { key: 'f10', label: 'Faktor 10', data: f10, border: 'border-blue-500', bg: 'bg-blue-500/5', text: 'text-blue-500' },
              { key: 'f5',  label: 'Faktor 5',  data: f5,  border: 'border-success',  bg: 'bg-success/5',  text: 'text-success'  },
            ] as const).map(({ key, label, data, border, bg, text }) => (
              <div key={key} className={`border-2 ${border} ${bg} rounded-xl p-4`}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                <p className={`text-2xl font-bold ${text}`}>
                  {data.reduce((s, d) => s + d.count, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{data.length} tur nuqson</p>
              </div>
            ))}
          </div>

          {/* Sort controls */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-foreground">Nuqsonlar ro'yxati</h2>
            <div className="inline-flex bg-card border border-border rounded-lg p-1 gap-1">
              {(['factor', 'count'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    sortBy === key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {key === 'factor' ? "Faktor bo'yicha" : "Soni bo'yicha"}
                </button>
              ))}
            </div>
          </div>

          {/* Defects table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Kod</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson nomi</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Soni</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Faktor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Og'irlik (S×F)</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Xavflilik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {defects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        Bu sehda hali nuqson kiritilmagan
                      </td>
                    </tr>
                  ) : (
                    defects.map((d, i) => (
                      <tr
                        key={`${d.code}-${i}`}
                        className={`transition-colors hover:bg-muted/30 ${
                          d.factor === 50 ? 'bg-critical/5' : d.factor === 20 ? 'bg-warning/5' : ''
                        }`}
                      >
                        <td className="px-5 py-3 font-bold text-foreground">{d.code}</td>
                        <td className="px-5 py-3 text-sm text-foreground">{d.name}</td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground">{d.count}</td>
                        <td className="px-5 py-3 text-right font-bold text-lg text-foreground">{d.factor}</td>
                        <td className="px-5 py-3 text-right font-semibold text-primary">{d.count * d.factor}</td>
                        <td className="px-5 py-3 text-right">
                          <Badge className={getRiskBadgeClass(d.factor)}>
                            {getRiskLabel(d.factor)}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN DASHBOARD VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const plantWDPV   = calcWDPV('PLANT')
  const plantTarget = wdpvTargets['PLANT']
  const plantOver   = plantWDPV > plantTarget
  const totalDefects = records.reduce((s, r) => s + r.count, 0)

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="GCA Daily Board"
        description="WDPV — Weighted Defects Per Vehicle • Sehlar bo'yicha nuqsonlar tahlili"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'GCA Daily Board' },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Plant WDPV */}
          <div className={`border-2 rounded-xl p-5 ${plantOver ? 'border-critical bg-critical/5' : 'border-success bg-success/5'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">PLANT WDPV</p>
              <Activity className={`w-4 h-4 ${plantOver ? 'text-critical' : 'text-success'}`} />
            </div>
            <p className={`text-3xl font-bold ${plantOver ? 'text-critical' : 'text-success'}`}>
              {plantWDPV.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Target: {plantTarget}</p>
          </div>

          {/* Total Defects */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">Jami nuqsonlar</p>
            <p className="text-3xl font-bold text-foreground">{totalDefects}</p>
            <p className="text-xs text-muted-foreground mt-1">{SHOPS.length} sehdan</p>
          </div>

          {/* Over Target shops */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">Target oshgan sehlar</p>
            <p className="text-3xl font-bold text-critical">
              {SHOPS.filter((s) => calcWDPV(s) > wdpvTargets[s]).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">ta seh</p>
          </div>

          {/* Vehicles count */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">Tekshirilgan avtomobil</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={vehicles}
                onChange={(e) => setVehicles(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-20 px-2 py-1 bg-background border border-border rounded-lg text-foreground text-xl font-bold"
              />
              <span className="text-xs text-muted-foreground">ta</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">WDPV hisoblash uchun</p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Ma'lumotlar yuklanmoqda...
          </div>
        )}

        {/* ── WDPV Bar Chart ─────────────────────────────────────────────── */}
        {!loading && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">WDPV — Actual vs Target</h2>
                <p className="text-xs text-muted-foreground">
                  Weighted Defects Per Vehicle (nuqsonlar soni / tekshirilgan avtomobil)
                </p>
              </div>
              <div className="flex items-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-primary" />
                  Actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-dashed border-yellow-500" />
                  Target
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
                <XAxis
                  dataKey="shop"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />

                <Bar dataKey="actual" name="Actual WDPV" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.actual > entry.target ? '#e05c3a' : '#7c6fcd'}
                      fillOpacity={0.9}
                    />
                  ))}
                </Bar>

                <Line
                  dataKey="target"
                  name="Target WDPV"
                  type="monotone"
                  stroke="#d4a017"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ fill: '#d4a017', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Shop Cards Grid ────────────────────────────────────────────── */}
        {!loading && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Sehlar bo'yicha — bosib kirish
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {SHOPS.map((shop) => {
                const wdpv   = calcWDPV(shop)
                const target = wdpvTargets[shop]
                const over   = wdpv > target
                const shopRecords = records.filter((r) => r.shop === shop)
                const total  = shopRecords.reduce((s, r) => s + r.count, 0)
                const pct    = Math.min(100, (wdpv / (target * 2)) * 100)
                const highRisk = shopRecords.filter((r) => r.factor === 50).reduce((s, r) => s + r.count, 0)

                return (
                  <button
                    key={shop}
                    onClick={() => setSelectedShop(shop)}
                    className={`group p-5 bg-card border-2 rounded-xl text-left transition-all hover:shadow-xl ${
                      over
                        ? 'border-critical hover:bg-critical/5'
                        : 'border-border hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-foreground text-sm leading-tight">{shop}</h3>
                      {over
                        ? <AlertTriangle className="w-4 h-4 text-critical flex-shrink-0" />
                        : <Target className="w-4 h-4 text-success flex-shrink-0" />
                      }
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground">WDPV</p>
                      <p className={`text-2xl font-bold ${over ? 'text-critical' : 'text-foreground'}`}>
                        {wdpv.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">target: {target.toFixed(2)}</p>
                    </div>

                    <div className="mb-3">
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${over ? 'bg-critical' : 'bg-success'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{total} nuqson</span>
                      {highRisk > 0 && (
                        <span className="text-critical font-semibold">{highRisk} yuqori</span>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Batafsil ko'rish →
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Factor Summary Table ───────────────────────────────────────── */}
        {!loading && records.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">
                Faktor bo'yicha umumiy taqsimot
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-critical">Faktor 50</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-warning">Faktor 20</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-blue-400">Faktor 10</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-success">Faktor 5</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">Jami</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">WDPV</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SHOPS.map((shop) => {
                    const shopRecords = records.filter((r) => r.shop === shop)
                    const f50 = shopRecords.filter((r) => r.factor === 50).reduce((s, r) => s + r.count, 0)
                    const f20 = shopRecords.filter((r) => r.factor === 20).reduce((s, r) => s + r.count, 0)
                    const f10 = shopRecords.filter((r) => r.factor === 10).reduce((s, r) => s + r.count, 0)
                    const f5  = shopRecords.filter((r) => r.factor === 5).reduce((s, r) => s + r.count, 0)
                    const tot = shopRecords.reduce((s, r) => s + r.count, 0)
                    const wdpv   = calcWDPV(shop)
                    const target = wdpvTargets[shop]
                    const over   = wdpv > target

                    return (
                      <tr
                        key={shop}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedShop(shop)}
                      >
                        <td className="px-5 py-3 font-semibold text-foreground">{shop}</td>
                        <td className="px-5 py-3 text-center">
                          {f50 > 0 ? <span className="font-bold text-critical">{f50}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {f20 > 0 ? <span className="font-bold text-warning">{f20}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {f10 > 0 ? <span className="font-bold text-blue-400">{f10}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {f5 > 0 ? <span className="font-bold text-success">{f5}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center font-semibold text-foreground">{tot}</td>
                        <td className="px-5 py-3 text-center font-bold text-foreground">{wdpv.toFixed(2)}</td>
                        <td className="px-5 py-3 text-center">
                          <Badge className={over ? 'bg-critical text-white' : 'bg-success text-white'}>
                            {over ? 'Yuqori' : 'OK'}
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

        {/* Empty state */}
        {!loading && records.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground text-sm">
              Hali GCA nuqsoni kiritilmagan.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              GCA Admin panelidan yangi yozuv qo'shing.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useDRecords } from '@/lib/d-records-context'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ChevronLeft, AlertTriangle, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ─── Config ───────────────────────────────────────────────────────────────────
const SHOPS = ['PRESS SHOP', 'WELDING-1', 'WELDING-2'] as const

const SHOP_SHORT: Record<string, string> = {
  'PRESS SHOP': 'PRESS',
  'WELDING-1':  'WELD-1',
  'WELDING-2':  'WELD-2',
}

const FACTOR_META = [
  { key: 'f50', label: 'Faktor 50', color: '#e05c3a', textCls: 'text-critical',   borderCls: 'border-critical', bgCls: 'bg-critical/5'  },
  { key: 'f20', label: 'Faktor 20', color: '#d4a017', textCls: 'text-warning',    borderCls: 'border-warning',  bgCls: 'bg-warning/5'   },
  { key: 'f10', label: 'Faktor 10', color: '#3b82f6', textCls: 'text-blue-500',   borderCls: 'border-blue-500', bgCls: 'bg-blue-500/5'  },
  { key: 'f5',  label: 'Faktor 5',  color: '#22c55e', textCls: 'text-success',    borderCls: 'border-success',  bgCls: 'bg-success/5'   },
] as const

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
    <div style={{
      background: 'var(--color-card, #1e1e2e)',
      border: '1px solid rgba(128,128,128,0.25)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill, flexShrink: 0 }} />
          <span style={{ opacity: 0.7 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function D10Page() {
  const { records: allRecords, loading } = useDRecords()
  const records = allRecords.filter((r) => r.type === 'd10')

  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'factor' | 'count'>('factor')

  // Chart data — faktor bo'yicha har bir seh uchun
  const chartData = useMemo(() => SHOPS.map((shop) => {
    const sr = records.filter((r) => r.shop === shop)
    return {
      shop: SHOP_SHORT[shop],
      shopFull: shop,
      'F-50': sr.filter((r) => r.factor === 50).reduce((s, r) => s + r.count, 0),
      'F-20': sr.filter((r) => r.factor === 20).reduce((s, r) => s + r.count, 0),
      'F-10': sr.filter((r) => r.factor === 10).reduce((s, r) => s + r.count, 0),
      'F-5':  sr.filter((r) => r.factor === 5).reduce((s, r)  => s + r.count, 0),
    }
  }), [records])

  // Sehdagi nuqsonlar (birlashtirilgan)
  const getShopDefects = (shop: string) => {
    const merged: { code: string; name: string; count: number; factor: number }[] = []
    records.filter((r) => r.shop === shop).forEach((r) => {
      const ex = merged.find((m) => m.code === r.code && m.factor === r.factor)
      if (ex) ex.count += r.count
      else merged.push({ code: r.code, name: r.codeName, count: r.count, factor: r.factor })
    })
    return sortBy === 'factor'
      ? merged.sort((a, b) => b.factor - a.factor)
      : merged.sort((a, b) => b.count - a.count)
  }

  // Umumiy KPI
  const totalAll = records.reduce((s, r) => s + r.count, 0)
  const f50All   = records.filter((r) => r.factor === 50).reduce((s, r) => s + r.count, 0)
  const f20All   = records.filter((r) => r.factor === 20).reduce((s, r) => s + r.count, 0)
  const f10All   = records.filter((r) => r.factor === 10).reduce((s, r) => s + r.count, 0)
  const f5All    = records.filter((r) => r.factor === 5).reduce((s, r)  => s + r.count, 0)

  // ══════════════════════════════════════════════════════════════════════════
  // SHOP DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedShop) {
    const defects    = getShopDefects(selectedShop)
    const totalCount = defects.reduce((s, d) => s + d.count, 0)
    const f50 = defects.filter((d) => d.factor === 50).reduce((s, d) => s + d.count, 0)
    const f20 = defects.filter((d) => d.factor === 20).reduce((s, d) => s + d.count, 0)
    const f10 = defects.filter((d) => d.factor === 10).reduce((s, d) => s + d.count, 0)
    const f5  = defects.filter((d) => d.factor === 5).reduce((s, d)  => s + d.count, 0)

    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title={`D10 — ${selectedShop}`}
          description="Sehdan kelgan D10 nuqsonlari • Faktor bo'yicha tahlil"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'D10 Daily Board', href: '/dashboard/d10' },
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
            D10 Daily Board ga qaytish
          </button>

          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-card border-2 border-border rounded-xl p-5">
              <p className="text-xs text-muted-foreground mb-1">Jami nuqsonlar</p>
              <p className="text-3xl font-bold text-foreground">{totalCount}</p>
            </div>
            {FACTOR_META.map(({ key, label, textCls, borderCls, bgCls }) => {
              const val = key === 'f50' ? f50 : key === 'f20' ? f20 : key === 'f10' ? f10 : f5
              return (
                <div key={key} className={`border-2 ${borderCls} ${bgCls} rounded-xl p-5`}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                  <p className={`text-3xl font-bold ${textCls}`}>{val}</p>
                </div>
              )
            })}
          </div>

          {/* Sort controls */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-foreground">Nuqsonlar ro&apos;yxati</h2>
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

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left  text-xs font-semibold text-muted-foreground">Kod</th>
                    <th className="px-5 py-3 text-left  text-xs font-semibold text-muted-foreground">Nuqson nomi</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Soni</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Faktor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Og&apos;irlik (S×F)</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Xavflilik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {defects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        Bu sehda hali D10 nuqsoni kiritilmagan
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
                          <Badge className={getRiskBadgeClass(d.factor)}>{getRiskLabel(d.factor)}</Badge>
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
  // MAIN DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="D10 Daily Board"
        description="D10 nuqsonlari • Sehlar va faktorlar bo'yicha taqsimot"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'D10 Daily Board' },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card border-2 border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Jami D10 nuqsonlari</p>
            <p className="text-3xl font-bold text-foreground">{totalAll}</p>
            <p className="text-xs text-muted-foreground mt-1">{SHOPS.length} sehdan</p>
          </div>
          {FACTOR_META.map(({ key, label, textCls, borderCls, bgCls }) => {
            const val = key === 'f50' ? f50All : key === 'f20' ? f20All : key === 'f10' ? f10All : f5All
            return (
              <div key={key} className={`border-2 ${borderCls} ${bgCls} rounded-xl p-5`}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                <p className={`text-3xl font-bold ${textCls}`}>{val}</p>
              </div>
            )
          })}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Ma&apos;lumotlar yuklanmoqda...
          </div>
        )}

        {/* ── Bar Chart ── faktor bo'yicha sehlar ─────────────────────────── */}
        {!loading && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">Faktor bo&apos;yicha taqsimot</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sehlar bo&apos;yicha D10 nuqsonlari — faktorlarga ko&apos;ra
              </p>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" vertical={false} />
                <XAxis
                  dataKey="shop"
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{value}</span>
                  )}
                />
                <Bar dataKey="F-50" name="Faktor 50" stackId="a" fill="#e05c3a" radius={[0,0,0,0]} maxBarSize={60} />
                <Bar dataKey="F-20" name="Faktor 20" stackId="a" fill="#d4a017" maxBarSize={60} />
                <Bar dataKey="F-10" name="Faktor 10" stackId="a" fill="#3b82f6" maxBarSize={60} />
                <Bar dataKey="F-5"  name="Faktor 5"  stackId="a" fill="#22c55e" radius={[6,6,0,0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Shop Cards ───────────────────────────────────────────────────── */}
        {!loading && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Sehlar bo&apos;yicha — bosib kirish
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SHOPS.map((shop) => {
                const sr       = records.filter((r) => r.shop === shop)
                const total    = sr.reduce((s, r) => s + r.count, 0)
                const f50      = sr.filter((r) => r.factor === 50).reduce((s, r) => s + r.count, 0)
                const f20      = sr.filter((r) => r.factor === 20).reduce((s, r) => s + r.count, 0)
                const f10      = sr.filter((r) => r.factor === 10).reduce((s, r) => s + r.count, 0)
                const f5       = sr.filter((r) => r.factor === 5).reduce((s, r)  => s + r.count, 0)
                const hasHigh  = f50 > 0

                return (
                  <button
                    key={shop}
                    onClick={() => setSelectedShop(shop)}
                    className={`group p-5 bg-card border-2 rounded-xl text-left transition-all hover:shadow-xl ${
                      hasHigh
                        ? 'border-critical hover:bg-critical/5'
                        : 'border-border hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-foreground text-sm">{shop}</h3>
                      {hasHigh
                        ? <AlertTriangle className="w-4 h-4 text-critical flex-shrink-0" />
                        : <Target        className="w-4 h-4 text-success  flex-shrink-0" />
                      }
                    </div>

                    <p className="text-3xl font-bold text-foreground mb-3">{total}</p>

                    {/* Faktor mini bars */}
                    <div className="space-y-1.5">
                      {[
                        { val: f50, label: 'F-50', color: 'bg-critical' },
                        { val: f20, label: 'F-20', color: 'bg-warning'  },
                        { val: f10, label: 'F-10', color: 'bg-blue-500' },
                        { val: f5,  label: 'F-5',  color: 'bg-success'  },
                      ].map(({ val, label, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-8 flex-shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${color} transition-all`}
                              style={{ width: total > 0 ? `${(val / total) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-5 text-right">{val}</span>
                        </div>
                      ))}
                    </div>

                    <p className="mt-4 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Batafsil ko&apos;rish →
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Factor Summary Table ─────────────────────────────────────────── */}
        {!loading && records.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Faktor bo&apos;yicha umumiy jadval</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left  text-xs font-semibold text-muted-foreground">Sehi</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-critical">Faktor 50</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-warning">Faktor 20</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-blue-400">Faktor 10</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-success">Faktor 5</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">Jami</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">Og&apos;irlik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SHOPS.map((shop) => {
                    const sr  = records.filter((r) => r.shop === shop)
                    const f50 = sr.filter((r) => r.factor === 50).reduce((s, r) => s + r.count, 0)
                    const f20 = sr.filter((r) => r.factor === 20).reduce((s, r) => s + r.count, 0)
                    const f10 = sr.filter((r) => r.factor === 10).reduce((s, r) => s + r.count, 0)
                    const f5  = sr.filter((r) => r.factor === 5).reduce((s, r)  => s + r.count, 0)
                    const tot = sr.reduce((s, r) => s + r.count, 0)
                    const ogirlik = sr.reduce((s, r) => s + r.count * r.factor, 0)

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
                          {f20 > 0 ? <span className="font-bold text-warning">{f20}</span>  : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {f10 > 0 ? <span className="font-bold text-blue-400">{f10}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {f5  > 0 ? <span className="font-bold text-success">{f5}</span>   : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-center font-semibold text-foreground">{tot}</td>
                        <td className="px-5 py-3 text-center font-bold text-primary">{ogirlik}</td>
                      </tr>
                    )
                  })}
                  {/* Jami qator */}
                  <tr className="bg-muted/20 font-bold">
                    <td className="px-5 py-3 text-foreground">JAMI</td>
                    <td className="px-5 py-3 text-center text-critical">{f50All || '—'}</td>
                    <td className="px-5 py-3 text-center text-warning">{f20All || '—'}</td>
                    <td className="px-5 py-3 text-center text-blue-400">{f10All || '—'}</td>
                    <td className="px-5 py-3 text-center text-success">{f5All || '—'}</td>
                    <td className="px-5 py-3 text-center text-foreground">{totalAll}</td>
                    <td className="px-5 py-3 text-center text-primary">
                      {records.reduce((s, r) => s + r.count * r.factor, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && records.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground text-sm">Hali D10 nuqsoni kiritilmagan.</p>
            <p className="text-muted-foreground text-xs mt-1">D10 Admin panelidan yangi yozuv qo&apos;shing.</p>
          </div>
        )}

      </div>
    </div>
  )
}

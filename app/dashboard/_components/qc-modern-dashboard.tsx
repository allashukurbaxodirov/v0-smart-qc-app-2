'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQRecords, QRecordType, QShift, QRecord } from '@/lib/qrecords-context'
import { gcaDefectCodes } from '@/lib/mock-data'
import { SHOP_LINES } from '@/lib/shift-context'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  AlertTriangle, CheckCircle2,
  RefreshCw, Plus, Trash2, Lock, Upload, X, BarChart3,
  Activity, Clock,
  TrendingUp, ChevronRight, Filter,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DashTheme {
  gradient:    string   // tailwind gradient classes for hero
  accent:      string   // tailwind text-* class
  accentBg:    string   // tailwind bg-* class (transparent variant)
  accentBorder:string
  accentSolid: string   // solid color for charts
  badge:       string
  ring:        string
  chart1:      string   // hex for recharts
  chart2:      string
  chart3:      string
}

export interface DashConfig {
  type:        QRecordType
  title:       string
  shortTitle:  string
  description: string
  kpiLabel:    string   // e.g. "Rad etilgan"
  kpiUnit:     string   // e.g. "dona"
  theme:       DashTheme
}

const SHOPS   = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const
const FACTORS = [5, 10, 20, 50] as const
const SHIFTS: QShift[] = ['A', 'B', 'D']
const LOCKED_ROLES = [
  'gca_auditor','cmm_inspector','d10_inspector','d20_inspector',
  'drr_inspector','drl_inspector','pdi_inspector','incoming_inspector',
  'ga_engineer','welding_engineer',
]

function todayStr() { return new Date().toISOString().split('T')[0] }

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function getRisk(factor: number) {
  if (factor >= 50) return { label: 'Kritik',    tw: 'bg-red-500/20 text-red-400 border-red-500/30' }
  if (factor >= 20) return { label: "O'rtacha",  tw: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
  return               { label: 'Past',         tw: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function QcModernDashboard({ cfg }: { cfg: DashConfig }) {
  const { records: all, addRecord, deleteRecord, loading, refresh } = useQRecords()
  const records = useMemo(() => all.filter(r => r.type === cfg.type), [all, cfg.type])

  const [session, setSession] = useState<{ role: string; shift: string | null; shop: string | null; name: string } | null>(null)
  const [showForm, setShowForm]       = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [filterShop, setFilterShop]   = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [filterDate, setFilterDate]   = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])

  // Auto-refresh 30s
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => { refresh(); setLastRefresh(new Date()) }, 30000)
    return () => clearInterval(t)
  }, [autoRefresh, refresh])

  const isLocked    = session ? LOCKED_ROLES.includes(session.role) : false
  const lockedShift = (isLocked && session?.shift) ? session.shift as QShift : null
  const lockedShop  = (isLocked && session?.shop)  ? session.shop  : null

  // ── Form state ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    shift:    'A' as QShift,
    date:     todayStr(),
    shop:     'PRESS SHOP',
    sector:   '',
    code:     gcaDefectCodes[0].code,
    codeName: gcaDefectCodes[0].name,
    factor:   5 as number,
    count:    1,
    notes:    '',
    image:    null as File | null,
  })

  useEffect(() => {
    if (lockedShift) setForm(p => ({ ...p, shift: lockedShift }))
    if (lockedShop)  setForm(p => ({ ...p, shop: lockedShop, sector: '' }))
  }, [lockedShift, lockedShop])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'shop') {
      setForm(p => ({ ...p, shop: value, sector: '' }))
    } else if (name === 'code') {
      const d = gcaDefectCodes.find(x => x.code === value)
      setForm(p => ({ ...p, code: value, codeName: d?.name ?? '' }))
    } else {
      setForm(p => ({
        ...p,
        [name]: (name === 'factor' || name === 'count')
          ? (value === '' ? '' : parseInt(value) || 0)
          : value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || form.count < 1) return
    if (isLocked && (!lockedShift || !lockedShop)) {
      alert("Sizga smena/seh tayinlanmagan. Admin bilan bog'laning.")
      return
    }
    let imageUrl: string | null = null
    if (form.image) {
      imageUrl = await new Promise(res => {
        const reader = new FileReader()
        reader.onload = ev => res((ev.target?.result as string) ?? null)
        reader.readAsDataURL(form.image!)
      })
    }
    await addRecord({
      type: cfg.type, date: form.date, shift: form.shift,
      shop: form.shop, sector: form.sector || null,
      code: form.code, codeName: form.codeName,
      factor: Number(form.factor), count: Number(form.count),
      notes: form.notes || null, imageUrl, createdByName: session?.name ?? null,
    })
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
    setForm(p => ({
      ...p, sector: '', code: gcaDefectCodes[0].code,
      codeName: gcaDefectCodes[0].name, count: 1, notes: '', image: null,
    }))
    setShowForm(false)
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const today = todayStr()
  const todayRec  = records.filter(r => r.date === today)
  const totalCount = records.reduce((s, r) => s + r.count, 0)
  const todayCount = todayRec.reduce((s, r) => s + r.count, 0)
  const criticalCount = records.filter(r => r.factor >= 50).reduce((s, r) => s + r.count, 0)
  const todayCritical = todayRec.filter(r => r.factor >= 50).reduce((s, r) => s + r.count, 0)

  const shiftStats = SHIFTS.map(sh => ({
    shift: `Smena ${sh}`,
    count: todayRec.filter(r => r.shift === sh).reduce((s, r) => s + r.count, 0),
  }))

  // Last 7 days trend
  const days = last7Days()
  const trendData = days.map(d => ({
    date: d.slice(5), // MM-DD
    count: records.filter(r => r.date === d).reduce((s, r) => s + r.count, 0),
  }))

  // Shop breakdown
  const shopData = SHOPS.map(sh => ({
    shop: sh.replace(' SHOP','').replace('WELDING-','W'),
    count: records.filter(r => r.shop === sh).reduce((s, r) => s + r.count, 0),
  })).filter(s => s.count > 0)

  // Top defects
  const defectMap: Record<string, number> = {}
  records.forEach(r => { defectMap[r.codeName] = (defectMap[r.codeName] ?? 0) + r.count })
  const topDefects = Object.entries(defectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, count }))

  // Filtered table
  const filtered = records
    .filter(r => !filterShop  || r.shop  === filterShop)
    .filter(r => !filterShift || r.shift === filterShift)
    .filter(r => !filterDate  || r.date  === filterDate)
    .slice(0, 100)

  const shopSectors = SHOP_LINES[form.shop as keyof typeof SHOP_LINES] ?? []

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f1e]">

      {/* ── HERO HEADER ────────────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden ${cfg.theme.gradient} px-6 pt-8 pb-16`}>
        {/* Texture overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        {/* Glow */}
        <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 ${cfg.theme.accentBg}`} />
        <div className={`absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-3xl opacity-15 ${cfg.theme.accentBg}`} />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-white/50 text-sm mb-4">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span className={cfg.theme.accent}>{cfg.shortTitle}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${cfg.theme.accentBg} ${cfg.theme.accent} border ${cfg.theme.accentBorder}`}>
                <Activity className="w-3 h-3" />
                Real-time monitoring
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{cfg.title}</h1>
              <p className="text-white/60 mt-2 max-w-xl">{cfg.description}</p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right text-xs text-white/40">
                <div>So'nggi yangilanish</div>
                <div className="text-white/60">{lastRefresh.toLocaleTimeString('uz-UZ')}</div>
              </div>
              <button
                onClick={() => { refresh(); setLastRefresh(new Date()) }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setAutoRefresh(p => !p)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  autoRefresh ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-white/60 border border-white/10'
                }`}
              >
                {autoRefresh ? '● Auto' : '○ Manual'}
              </button>
              <button
                onClick={() => setShowForm(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${cfg.theme.accentSolid} text-white shadow-lg`}
              >
                <Plus className="w-4 h-4" />
                Yozuv qo'shish
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 pb-12 space-y-6">

        {/* ── KPI CARDS ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: `Bugun (${cfg.kpiLabel})`,
              value: todayCount,
              sub: `${todayRec.length} yozuv`,
              icon: <Clock className="w-5 h-5" />,
              color: cfg.theme.accent,
              bg: cfg.theme.accentBg,
              border: cfg.theme.accentBorder,
              trend: null,
            },
            {
              label: 'Jami (barcha vaqt)',
              value: totalCount,
              sub: `${records.length} yozuv`,
              icon: <BarChart3 className="w-5 h-5" />,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              border: 'border-blue-500/20',
              trend: null,
            },
            {
              label: 'Kritik (F-50)',
              value: criticalCount,
              sub: `Bugun: ${todayCritical}`,
              icon: <AlertTriangle className="w-5 h-5" />,
              color: 'text-red-400',
              bg: 'bg-red-500/10',
              border: 'border-red-500/20',
              trend: criticalCount > 0 ? 'bad' : 'good',
            },
          ].map((kpi, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-2xl border ${kpi.border} ${kpi.bg} backdrop-blur-sm p-5`}
            >
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.5) 0%, transparent 60%)' }} />
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${kpi.bg} border ${kpi.border} ${kpi.color}`}>
                  {kpi.icon}
                </div>
                {kpi.trend === 'good' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {kpi.trend === 'bad'  && <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>
              <p className={`text-2xl font-bold text-white mb-1`}>{kpi.value.toLocaleString()}</p>
              <p className="text-xs text-white/50 leading-tight">{kpi.label}</p>
              <p className="text-xs text-white/30 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* ── CHARTS ROW ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Trend chart */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white">So'nggi 7 kun trendi</h3>
                <p className="text-xs text-white/40 mt-0.5">Kunlik {cfg.kpiLabel.toLowerCase()} soni</p>
              </div>
              <TrendingUp className={`w-5 h-5 ${cfg.theme.accent}`} />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Soni" fill={cfg.theme.chart1} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Smena breakdown */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Bugun smena bo'yicha</h3>
                <p className="text-xs text-white/40 mt-0.5">A / B / D smenalar</p>
              </div>
              <Activity className={`w-5 h-5 ${cfg.theme.accent}`} />
            </div>
            <div className="space-y-4">
              {shiftStats.map(s => {
                const maxCount = Math.max(...shiftStats.map(x => x.count), 1)
                const pct = Math.round((s.count / maxCount) * 100)
                return (
                  <div key={s.shift}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-white/70 font-medium">{s.shift}</span>
                      <span className="text-white font-semibold">{s.count}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.theme.chart1}, ${cfg.theme.chart2})` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Shop breakdown */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Sexi bo'yicha</h3>
            <p className="text-xs text-white/40 mb-5">Jami {cfg.kpiLabel.toLowerCase()} taqsimoti</p>
            {shopData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-white/20">
                <BarChart3 className="w-8 h-8 mb-2" />
                <p className="text-xs">Ma'lumot yo'q</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={shopData} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="shop" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Soni" fill={cfg.theme.chart1} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top defects */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Top-5 nuqsonlar</h3>
            <p className="text-xs text-white/40 mb-5">Eng ko'p uchraydigan</p>
            <div className="space-y-3">
              {topDefects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-white/20">
                  <CheckCircle2 className="w-8 h-8 mb-2" />
                  <p className="text-xs">Nuqson yo'q</p>
                </div>
              ) : topDefects.map((item, i) => {
                  const maxC = topDefects[0].count
                  const pct = Math.round((item.count / maxC) * 100)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70 truncate max-w-[150px]">{item.name}</span>
                        <span className={`font-bold ${cfg.theme.accent}`}>{item.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.theme.chart1 }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Tezkor statistika</h3>
            <p className="text-xs text-white/40 mb-5">Barcha vaqt bo'yicha</p>
            <div className="space-y-3">
              {[
                { label: 'Jami yozuvlar', value: records.length },
                { label: "Jami dona (count)", value: totalCount },
                { label: "Kritik (F-50) dona", value: criticalCount },
                { label: "O'rtacha (F-20) dona", value: records.filter(r => r.factor === 20).reduce((s,r)=>s+r.count,0) },
                { label: 'Past (F-10) dona', value: records.filter(r => r.factor === 10).reduce((s,r)=>s+r.count,0) },
                { label: 'Minimal (F-5) dona', value: records.filter(r => r.factor === 5).reduce((s,r)=>s+r.count,0) },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs text-white/50">{s.label}</span>
                  <span className="text-sm font-semibold text-white">{s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TABLE ──────────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Yozuvlar jadvali</h3>
              <p className="text-xs text-white/40 mt-0.5">{filtered.length} ta yozuv ko'rsatilmoqda</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-white/40" />
              <select
                value={filterShop} onChange={e => setFilterShop(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/30"
              >
                <option value="">Barcha sehlar</option>
                {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filterShift} onChange={e => setFilterShift(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/30"
              >
                <option value="">Barcha smenalar</option>
                {SHIFTS.map(s => <option key={s} value={s}>Smena {s}</option>)}
              </select>
              <input
                type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-white/30"
              />
              {(filterShop || filterShift || filterDate) && (
                <button onClick={() => { setFilterShop(''); setFilterShift(''); setFilterDate('') }}
                  className="px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  Tozalash
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Sana','Smena','Sexi','Sektor','Kod','Nuqson nomi','Soni','Faktor','Xavf',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-white/20 text-sm">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Hali ma'lumot yo'q
                    </td>
                  </tr>
                ) : filtered.map((r, i) => {
                  const risk = getRisk(r.factor)
                  return (
                    <tr key={r.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/2'}`}>
                      <td className="px-4 py-3 text-xs text-white/60">{r.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${cfg.theme.accentBg} ${cfg.theme.accent} border ${cfg.theme.accentBorder}`}>
                          {r.shift}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/70">{r.shop}</td>
                      <td className="px-4 py-3 text-xs text-white/40">{r.sector ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-white/80">{r.code}</td>
                      <td className="px-4 py-3 text-xs text-white/60 max-w-[180px] truncate">{r.codeName}</td>
                      <td className="px-4 py-3 text-sm font-bold text-white">{r.count}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white/80">{r.factor}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${risk.tw}`}>
                          {risk.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteRecord(r.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── FORM MODAL ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className={`relative overflow-hidden ${cfg.theme.gradient} px-6 py-5`}>
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Yangi yozuv</h2>
                  <p className="text-xs text-white/60">{cfg.title}</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isLocked && (!lockedShift || !lockedShop) && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-400">Smena/seh tayinlanmagan. Admin bilan bog'laning.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 font-medium block mb-1.5">Smena *</label>
                    {isLocked && lockedShift ? (
                      <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-bold flex items-center gap-2">
                        <Lock className="w-3 h-3 text-white/30" /> Smena {lockedShift}
                      </div>
                    ) : (
                      <select name="shift" value={form.shift} onChange={handleChange}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30">
                        {SHIFTS.map(s => <option key={s} value={s} className="bg-slate-900">Smena {s}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-white/50 font-medium block mb-1.5">Sana *</label>
                    <input type="date" name="date" value={form.date} onChange={handleChange}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 font-medium block mb-1.5">Sexi *</label>
                  {isLocked && lockedShop ? (
                    <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-bold flex items-center gap-2">
                      <Lock className="w-3 h-3 text-white/30" /> {lockedShop}
                    </div>
                  ) : (
                    <select name="shop" value={form.shop} onChange={handleChange}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30">
                      {SHOPS.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs text-white/50 font-medium block mb-1.5">Sektor</label>
                  <select name="sector" value={form.sector} onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30">
                    <option value="" className="bg-slate-900">— Sektorsiz —</option>
                    {shopSectors.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/50 font-medium block mb-1.5">Nuqson kodi *</label>
                  <select name="code" value={form.code} onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30">
                    {gcaDefectCodes.map(d => (
                      <option key={d.code} value={d.code} className="bg-slate-900">{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 min-h-[36px]">
                  {form.codeName || <span className="text-white/20">Kod tanlanganda to'ldiriladi</span>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 font-medium block mb-1.5">Faktor *</label>
                    <select name="factor" value={form.factor} onChange={handleChange}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30">
                      {FACTORS.map(f => (
                        <option key={f} value={f} className="bg-slate-900">
                          {f} — {f===50?'Kritik':f===20?"O'rtacha":f===10?'Past':'Minimal'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 font-medium block mb-1.5">Soni *</label>
                    <input type="number" name="count" value={form.count} onChange={handleChange} min="1"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 font-medium block mb-1.5">Rasm (ixtiyoriy)</label>
                  <label className="flex items-center gap-3 border border-dashed border-white/10 rounded-xl p-3 cursor-pointer hover:border-white/30 transition-colors">
                    <Upload className="w-4 h-4 text-white/30" />
                    <span className="text-xs text-white/40">{form.image ? `✓ ${form.image.name}` : 'Rasm yuklang...'}</span>
                    <input type="file" accept="image/*"
                      onChange={e => setForm(p => ({ ...p, image: e.target.files?.[0] ?? null }))}
                      className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="text-xs text-white/50 font-medium block mb-1.5">Izoh</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                    placeholder="Qo'shimcha ma'lumot..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30 resize-none placeholder:text-white/20" />
                </div>

                <button
                  type="submit"
                  disabled={isLocked && (!lockedShift || !lockedShop)}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${cfg.theme.accentSolid} text-white disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Saqlash
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS TOAST ───────────────────────────────────────────────────────── */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-900/90 border border-emerald-500/30 text-emerald-300 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">Muvaffaqiyatli saqlandi!</span>
        </div>
      )}
    </div>
  )
}

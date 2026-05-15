'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA } from '@/lib/gca-context'
import { useDRecords } from '@/lib/d-records-context'
import {
  useShift,
  SHOP_LINES,
  SHOPS_ALL,
  Shift,
  ShopType,
} from '@/lib/shift-context'
import { useQRecords } from '@/lib/qrecords-context'
import { useIncoming } from '@/lib/incoming-context'
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Legend,
} from 'recharts'
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronRight,
  Activity, TrendingDown, TrendingUp, Layers,
  RefreshCw, Package, Eye,
} from 'lucide-react'
import Link from 'next/link'

// ─── Config ────────────────────────────────────────────────────────────────────
const DEFAULT_GCA_TARGETS: Record<string, number> = {
  'PRESS SHOP': 0.40, 'WELDING-1': 0.45,
  'WELDING-2':  0.45, 'PAINT SHOP': 0.70, 'GA': 0.50,
}
const DEFAULT_PLANT_TARGET = 2.5
const DEFAULT_VEHICLES     = 50
const LS_TARGETS_KEY  = 'gca_wdpv_targets_v1'
const LS_VEHICLES_KEY = 'gca_vehicles_v1'

function loadDynTargets() {
  if (typeof window === 'undefined') return { targets: { ...DEFAULT_GCA_TARGETS }, plant: DEFAULT_PLANT_TARGET, vehicles: DEFAULT_VEHICLES }
  try {
    const t = localStorage.getItem(LS_TARGETS_KEY)
    const v = localStorage.getItem(LS_VEHICLES_KEY)
    const parsed = t ? JSON.parse(t) : {}
    return {
      targets:  { ...DEFAULT_GCA_TARGETS, ...parsed },
      plant:    parsed?.PLANT   ?? DEFAULT_PLANT_TARGET,
      vehicles: v ? Number(v)   : DEFAULT_VEHICLES,
    }
  } catch { return { targets: { ...DEFAULT_GCA_TARGETS }, plant: DEFAULT_PLANT_TARGET, vehicles: DEFAULT_VEHICLES } }
}

// Mutable module-level refs (updated by useEffect, trigger re-render via targetsVer)
let GCA_TARGETS   = { ...DEFAULT_GCA_TARGETS }
let PLANT_TARGET  = DEFAULT_PLANT_TARGET
let VEHICLES      = DEFAULT_VEHICLES
const D_SHOPS      = ['PRESS SHOP', 'WELDING-1', 'WELDING-2'] as const

type Status = 'ok' | 'warn' | 'crit'

function drrSt(v: number): Status { return v <= 5  ? 'ok' : v <= 15 ? 'warn' : 'crit' }
function drlSt(v: number): Status { return v <= 3  ? 'ok' : v <= 8  ? 'warn' : 'crit' }
function gcaSt(w: number, shop: string): Status {
  const t = GCA_TARGETS[shop] ?? 0.5
  return w <= t ? 'ok' : w <= t * 1.5 ? 'warn' : 'crit'
}
function dCntSt(v: number): Status { return v <= 5  ? 'ok' : v <= 15 ? 'warn' : 'crit' }
function incSt(v: number):  Status { return v <= 3  ? 'ok' : v <= 10 ? 'warn' : 'crit' }
function pdiSt(v: number):  Status { return v <= 2  ? 'ok' : v <= 7  ? 'warn' : 'crit' }
function overall(...ss: Status[]): Status {
  return ss.includes('crit') ? 'crit' : ss.includes('warn') ? 'warn' : 'ok'
}

// ─── Rang tizimi — ochiq, aniq ────────────────────────────────────────────────
const ST: Record<Status, {
  bg: string; border: string; text: string; dot: string; pill: string; row: string; label: string
}> = {
  ok: {
    bg:     'bg-emerald-500/10',
    border: 'border-emerald-500/50',
    text:   'text-emerald-500',
    dot:    'bg-emerald-500',
    pill:   'bg-emerald-500/15 text-emerald-600 border-emerald-500/40',
    row:    '',
    label:  'Normal',
  },
  warn: {
    bg:     'bg-amber-500/10',
    border: 'border-amber-500/50',
    text:   'text-amber-500',
    dot:    'bg-amber-500',
    pill:   'bg-amber-500/15 text-amber-600 border-amber-500/40',
    row:    'bg-amber-500/5',
    label:  'Diqqat',
  },
  crit: {
    bg:     'bg-rose-500/10',
    border: 'border-rose-500/50',
    text:   'text-rose-500',
    dot:    'bg-rose-500',
    pill:   'bg-rose-500/15 text-rose-600 border-rose-500/40',
    row:    'bg-rose-500/5',
    label:  'Kritik',
  },
}

// ─── Jadval katagi ─────────────────────────────────────────────────────────────
function MCell({ v, st, f2 }: { v: number; st: Status; f2?: boolean }) {
  const disp = f2 ? v.toFixed(2) : String(v)
  return (
    <td className="px-3 py-3.5 text-center">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold border ${ST[st].pill}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ST[st].dot}`} />
        {disp}
      </span>
    </td>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">
            {typeof p.value === 'number' && p.value % 1 !== 0 ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ManagerPage() {
  const [activeShift,  setActiveShift]  = useState<Shift>('A')
  const [activeDate,   setActiveDate]   = useState(() => new Date().toISOString().split('T')[0])
  // Dynamic GCA targets (updated by SuperAdmin panel)
  const [targetsVer, setTargetsVer] = useState(0)
  useEffect(() => {
    const apply = () => {
      const { targets, plant, vehicles } = loadDynTargets()
      Object.assign(GCA_TARGETS, targets)
      PLANT_TARGET = plant
      VEHICLES     = vehicles
      setTargetsVer(v => v + 1)
    }
    apply()
    window.addEventListener('gca_targets_updated', apply)
    return () => window.removeEventListener('gca_targets_updated', apply)
  }, [])
  const [expandedShop, setExpandedShop] = useState<ShopType | null>(null)

  const { records: gcaRecs,  loading: gcaLoad, refresh: gcaRefresh }   = useGCA()
  const { records: dAllRecs, loading: dLoad,   refresh: dRefresh   }   = useDRecords()
  const { entries: allShiftEntries } = useShift()
  const { records: qRecs, refresh: qRefresh }                          = useQRecords()
  const { records: incomingRecs, refresh: incomingRefresh }            = useIncoming()

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [refreshing,  setRefreshing]  = useState(false)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([gcaRefresh(), dRefresh(), qRefresh(), incomingRefresh()])
    setLastUpdated(new Date())
    setRefreshing(false)
  }, [gcaRefresh, dRefresh, qRefresh])

  useEffect(() => {
    const id = setInterval(refreshAll, 30_000)
    return () => clearInterval(id)
  }, [refreshAll])

  // Barcha D10/D20 — sektor tahlili va lineDetail uchun (filtrlanmagan)
  const d10Recs = useMemo(() => dAllRecs.filter(r => r.type === 'd10'), [dAllRecs])
  const d20Recs = useMemo(() => dAllRecs.filter(r => r.type === 'd20'), [dAllRecs])

  // Tanlangan sana bo'yicha filtrlangan — shopMetrics uchun
  const filteredGcaRecs = useMemo(() => gcaRecs.filter(r => r.date === activeDate), [gcaRecs, activeDate])
  const filteredD10Recs = useMemo(() => d10Recs.filter(r => r.date === activeDate), [d10Recs, activeDate])
  const filteredD20Recs = useMemo(() => d20Recs.filter(r => r.date === activeDate), [d20Recs, activeDate])

  const shiftEntries = useMemo(
    () => allShiftEntries.filter(e => e.shift === activeShift && e.date === activeDate),
    [allShiftEntries, activeShift, activeDate]
  )

  // Smena+sana bo'yicha filtrlangan incoming yozuvlari
  const filteredIncoming = useMemo(
    () => incomingRecs.filter(r => r.shift === activeShift && r.date === activeDate),
    [incomingRecs, activeShift, activeDate]
  )
  const filteredQRecs = useMemo(
    () => qRecs.filter(r => r.shift === activeShift && r.date === activeDate),
    [qRecs, activeShift, activeDate]
  )

  const shopMetrics = useMemo(() => SHOPS_ALL.map(shop => {
    const gcaCnt = filteredGcaRecs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
    const wdpv   = VEHICLES > 0 ? gcaCnt / VEHICLES : 0
    const gs     = gcaSt(wdpv, shop)
    const d10cnt = filteredD10Recs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
    const d20cnt = filteredD20Recs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
    const shopQR = filteredQRecs.filter(r => r.shop === shop)
    const drr    = shopQR.filter(r => r.type === 'drr').reduce((s, r) => s + r.count, 0)
    const drl    = shopQR.filter(r => r.type === 'drl').reduce((s, r) => s + r.count, 0)
    const pdi    = shopQR.filter(r => r.type === 'pdi').reduce((s, r) => s + r.count, 0)
    const inc    = shiftEntries.filter(e => e.shop === shop).reduce((s, e) => s + e.incoming, 0)
    const ov     = overall(gs, dCntSt(d10cnt), dCntSt(d20cnt), drrSt(drr), drlSt(drl), incSt(inc), pdiSt(pdi))
    return { shop, wdpv, gs, d10cnt, d20cnt, drr, drl, inc, pdi, ov }
  }), [filteredGcaRecs, filteredD10Recs, filteredD20Recs, filteredQRecs, shiftEntries, targetsVer])

  const plant = useMemo(() => ({
    wdpv:          VEHICLES > 0 ? filteredGcaRecs.reduce((s, r) => s + r.count, 0) / VEHICLES : 0,
    d10:           filteredD10Recs.reduce((s, r) => s + r.count, 0),
    d20:           filteredD20Recs.reduce((s, r) => s + r.count, 0),
    drr:           filteredQRecs.filter(r => r.type === 'drr').reduce((s, r) => s + r.count, 0),
    drl:           filteredQRecs.filter(r => r.type === 'drl').reduce((s, r) => s + r.count, 0),
    pdi:           filteredQRecs.filter(r => r.type === 'pdi').reduce((s, r) => s + r.count, 0),
    incomingTotal: filteredIncoming.reduce((s, r) => s + r.totalCount,  0),
    incomingDefect:filteredIncoming.reduce((s, r) => s + r.defectCount, 0),
  }), [filteredGcaRecs, filteredD10Recs, filteredD20Recs, filteredQRecs, filteredIncoming, targetsVer])

  const gcaChart = useMemo(() => SHOPS_ALL.map(shop => ({
    shop:   shop.replace(' SHOP', '').replace('WELDING-', 'W-'),
    actual: parseFloat((VEHICLES > 0 ? filteredGcaRecs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0) / VEHICLES : 0).toFixed(2)),
    target: GCA_TARGETS[shop] ?? 0.5,
  })), [filteredGcaRecs, targetsVer])

  function dChart(type: 'd10' | 'd20') {
    const recs = type === 'd10' ? filteredD10Recs : filteredD20Recs
    return D_SHOPS.map(shop => {
      const sr = recs.filter(r => r.shop === shop)
      return {
        shop:  shop.replace(' SHOP', '').replace('WELDING-', 'W-'),
        'F-50': sr.filter(r => r.factor === 50).reduce((s, r) => s + r.count, 0),
        'F-20': sr.filter(r => r.factor === 20).reduce((s, r) => s + r.count, 0),
        'F-10': sr.filter(r => r.factor === 10).reduce((s, r) => s + r.count, 0),
        'F-5':  sr.filter(r => r.factor ===  5).reduce((s, r) => s + r.count, 0),
      }
    })
  }

  const lineDetail = useMemo(() => {
    if (!expandedShop) return []
    return SHOP_LINES[expandedShop].map(line => {
      const le      = shiftEntries.filter(e => e.shop === expandedShop && e.line === line)
      const lineQR  = filteredQRecs.filter(r => r.shop === expandedShop && r.sector === line)
      const lineGCA = gcaRecs.filter(r => r.shop === expandedShop && r.sector === line)
      const lineD10 = d10Recs.filter(r => r.shop === expandedShop && r.sector === line)
      const lineD20 = d20Recs.filter(r => r.shop === expandedShop && r.sector === line)
      const gcaCnt  = lineGCA.reduce((s, r) => s + r.count, 0)
      const wdpv    = VEHICLES > 0 ? gcaCnt / VEHICLES : 0
      return {
        line,
        wdpv,
        gs:     gcaSt(wdpv, expandedShop),
        d10cnt: lineD10.reduce((s, r) => s + r.count, 0),
        d20cnt: lineD20.reduce((s, r) => s + r.count, 0),
        drr:    lineQR.filter(r => r.type === 'drr').reduce((s, r) => s + r.count, 0),
        drl:    lineQR.filter(r => r.type === 'drl').reduce((s, r) => s + r.count, 0),
        inc:    le.reduce((s, e) => s + e.incoming, 0),
        pdi:    lineQR.filter(r => r.type === 'pdi').reduce((s, r) => s + r.count, 0),
      }
    })
  }, [expandedShop, shiftEntries, filteredQRecs, gcaRecs, d10Recs, d20Recs])

  const critCount = shopMetrics.filter(s => s.ov === 'crit').length
  const warnCount = shopMetrics.filter(s => s.ov === 'warn').length

  const kpiCards = [
    { label: 'GCA WDPV',         value: plant.wdpv.toFixed(2), st: (plant.wdpv <= PLANT_TARGET ? 'ok' : plant.wdpv <= PLANT_TARGET * 1.5 ? 'warn' : 'crit') as Status, sub: `Maqsad ≤ ${PLANT_TARGET}`,  icon: <Activity className="w-5 h-5" /> },
    { label: 'D10',               value: String(plant.d10),     st: dCntSt(plant.d10),   sub: 'Nuqsonlar soni',       icon: <Layers className="w-5 h-5" /> },
    { label: 'D20',               value: String(plant.d20),     st: dCntSt(plant.d20),   sub: 'Nuqsonlar soni',       icon: <Layers className="w-5 h-5" /> },
    { label: 'DRR',               value: String(plant.drr),     st: drrSt(plant.drr),    sub: 'Rad etilgan',          icon: <TrendingDown className="w-5 h-5" /> },
    { label: 'DRL',               value: String(plant.drl),     st: drlSt(plant.drl),    sub: 'Qayta ishlangan',      icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Kiruvchi nazorat',  value: String(plant.incomingDefect), st: incSt(plant.incomingDefect), sub: `Jami: ${plant.incomingTotal} ta detal`, icon: <Package className="w-5 h-5" /> },
    { label: 'PDI',               value: String(plant.pdi),     st: pdiSt(plant.pdi),    sub: 'Yetkazish nazorati',   icon: <CheckCircle className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Rahbar Paneli"
        description="Zavod sifat ko'rsatkichlari — faqat kuzatuv"
      />

      <div className="p-5 md:p-6 space-y-6">

        {/* ── 1. SMENA / SANA / HOLAT ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Smena tugmalari */}
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-xl p-1">
            {(['A', 'B', 'D'] as Shift[]).map(s => (
              <button
                key={s}
                onClick={() => setActiveShift(s)}
                className={`px-7 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  activeShift === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                Smena {s}
              </button>
            ))}
          </div>

          {/* Sana */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Sana:</span>
            <input
              type="date"
              value={activeDate}
              onChange={e => setActiveDate(e.target.value)}
              className="text-sm font-medium bg-transparent border-0 focus:outline-none text-foreground"
            />
          </div>

          {/* Holat belgilari */}
          {critCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/50 border border-rose-700/50">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-semibold text-rose-300">{critCount} ta seh — KRITIK</span>
            </div>
          )}
          {warnCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-950/50 border border-amber-700/50">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-amber-300">{warnCount} ta seh — Diqqat</span>
            </div>
          )}
          {critCount === 0 && warnCount === 0 && !gcaLoad && !dLoad && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-700/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-300">Barcha sehlar — Normal</span>
            </div>
          )}

          {/* Yangilash */}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground">
              {lastUpdated.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <button
              onClick={refreshAll}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Yangilanmoqda...' : 'Yangilash'}
            </button>
          </div>
        </div>

        {/* ── 2. KPI KARTOCHKALAR ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {kpiCards.map(({ label, value, st, sub, icon }) => (
            <div
              key={label}
              className={`relative bg-card border rounded-xl p-4 overflow-hidden ${ST[st].border}`}
            >
              {/* Chap chiziq */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${ST[st].dot}`} />
              <div className={`mb-2 ${ST[st].text}`}>{icon}</div>
              <p className="text-xs text-muted-foreground mb-0.5 font-medium">{label}</p>
              <p className={`text-2xl font-bold ${ST[st].text}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── 3. SEHLAR HOLATI + INCOMING ──────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Sehlar jadvali */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div>
                <h2 className="text-base font-bold text-foreground">Sehlar Holati</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Smena {activeShift} · {activeDate}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Normal</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Diqqat</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-600" />Kritik</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-5 py-3 text-left text-sm font-semibold text-muted-foreground w-40">Seh nomi</th>
                    <th className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-blue-400">GCA</span>
                      <span className="block text-xs text-muted-foreground font-normal">WDPV</span>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-violet-400">D10</span>
                      <span className="block text-xs text-muted-foreground font-normal">soni</span>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-indigo-400">D20</span>
                      <span className="block text-xs text-muted-foreground font-normal">soni</span>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-orange-400">DRR</span>
                      <span className="block text-xs text-muted-foreground font-normal">rad etil.</span>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-yellow-400">DRL</span>
                      <span className="block text-xs text-muted-foreground font-normal">qayta isl.</span>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-purple-400">PDI</span>
                      <span className="block text-xs text-muted-foreground font-normal">tekshiruv</span>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shopMetrics.map(m => (
                    <React.Fragment key={m.shop}>
                      <tr
                        onClick={() => setExpandedShop(expandedShop === m.shop ? null : m.shop)}
                        className={`cursor-pointer transition-colors hover:bg-muted/20 ${ST[m.ov].row}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ST[m.ov].dot}`} />
                            <span className="text-sm font-semibold text-foreground">{m.shop}</span>
                            <span className="ml-auto text-muted-foreground/60">
                              {expandedShop === m.shop
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />}
                            </span>
                          </div>
                        </td>
                        <MCell v={parseFloat(m.wdpv.toFixed(2))} st={m.gs} f2 />
                        <MCell v={m.d10cnt} st={dCntSt(m.d10cnt)} />
                        <MCell v={m.d20cnt} st={dCntSt(m.d20cnt)} />
                        <MCell v={m.drr} st={drrSt(m.drr)} />
                        <MCell v={m.drl} st={drlSt(m.drl)} />
                        <MCell v={m.pdi} st={pdiSt(m.pdi)} />
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-3 py-1 rounded-md text-sm font-semibold border ${ST[m.ov].pill}`}>
                            {ST[m.ov].label}
                          </span>
                        </td>
                      </tr>

                      {expandedShop === m.shop && lineDetail.map(({ line, wdpv, gs, d10cnt, d20cnt, drr, drl, pdi }) => (
                        <tr key={line} className="bg-muted/5 hover:bg-muted/15 transition-colors">
                          <td className="px-5 py-2.5 pl-12">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground/50 text-xs">└</span>
                              <span className="text-sm text-muted-foreground font-medium">{line}</span>
                            </div>
                          </td>
                          <MCell v={parseFloat(wdpv.toFixed(2))} st={gs} f2 />
                          <MCell v={d10cnt} st={dCntSt(d10cnt)} />
                          <MCell v={d20cnt} st={dCntSt(d20cnt)} />
                          <MCell v={drr} st={drrSt(drr)} />
                          <MCell v={drl} st={drlSt(drl)} />
                          <MCell v={pdi} st={pdiSt(pdi)} />
                          <td className="px-4 py-2.5 text-center text-sm text-muted-foreground/40">—</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-2.5 border-t border-border bg-muted/10 text-xs text-muted-foreground">
              Sehni bosing — sektorlar bo'yicha GCA, D10, D20, DRR, DRL, PDI ko'rsatkichlari ochiladi
            </div>
          </div>

          {/* Incoming Control */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="bg-card border border-cyan-500/40 rounded-xl overflow-hidden flex-1">
              <div className="px-5 py-4 border-b border-border bg-cyan-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h2 className="text-base font-bold text-foreground">Kiruvchi Nazorat</h2>
                    <p className="text-xs text-muted-foreground">Smena {activeShift}</p>
                  </div>
                </div>
                <Link href="/dashboard/incoming-admin" className="text-xs text-cyan-500 hover:underline">Admin →</Link>
              </div>

              {/* Jami */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nuqsonli detallar</p>
                    <p className={`text-4xl font-bold ${plant.incomingDefect > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{plant.incomingDefect}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Jami keldi</p>
                    <p className="text-2xl font-bold text-foreground">{plant.incomingTotal}</p>
                  </div>
                </div>
                {plant.incomingTotal > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Nuqson foizi</span>
                      <span>{((plant.incomingDefect / plant.incomingTotal) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${plant.incomingDefect / plant.incomingTotal > 0.05 ? 'bg-rose-500' : plant.incomingDefect > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min((plant.incomingDefect / plant.incomingTotal) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Omborxonalar */}
              <div className="divide-y divide-border/60">
                {(['WAREHOUSE-1', 'WAREHOUSE-2', 'SP ZONE'] as const).map(wh => {
                  const whRecs  = filteredIncoming.filter(r => r.warehouse === wh)
                  const total   = whRecs.reduce((s, r) => s + r.totalCount,  0)
                  const defects = whRecs.reduce((s, r) => s + r.defectCount, 0)
                  const badgeColor = wh === 'WAREHOUSE-1' ? 'bg-blue-500/15 text-blue-600 border-blue-500/40'
                                   : wh === 'WAREHOUSE-2' ? 'bg-indigo-500/15 text-indigo-600 border-indigo-500/40'
                                   : 'bg-amber-500/15 text-amber-600 border-amber-500/40'
                  return (
                    <div key={wh} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeColor}`}>{wh}</span>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">Keldi: <span className="text-foreground font-medium">{total}</span></span>
                          <span className={`font-bold ${defects > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{defects} nuqsonli</span>
                        </div>
                      </div>
                      {total > 0 && (
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${defects / total > 0.05 ? 'bg-rose-500' : defects > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min((defects / total) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="px-5 py-3 border-t border-border bg-muted/10 text-xs text-muted-foreground">
                {filteredIncoming.length === 0
                  ? <span className="italic">Bu smena uchun ma'lumot yo'q</span>
                  : <span>{filteredIncoming.length} ta yozuv • {activeDate}</span>
                }
              </div>
            </div>

            {/* Bar chart */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Omborxona grafigi</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={(['WAREHOUSE-1', 'WAREHOUSE-2', 'SP ZONE'] as const).map(wh => {
                    const whRecs = filteredIncoming.filter(r => r.warehouse === wh)
                    return {
                      wh: wh === 'WAREHOUSE-1' ? 'WH-1' : wh === 'WAREHOUSE-2' ? 'WH-2' : 'SP',
                      Keldi:    whRecs.reduce((s, r) => s + r.totalCount,  0),
                      Nuqsonli: whRecs.reduce((s, r) => s + r.defectCount, 0),
                    }
                  })}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                  <XAxis dataKey="wh" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="Keldi"    name="Keldi"    fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Nuqsonli" name="Nuqsonli" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── 4. GRAFIKLAR ─────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">Grafiklar</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-foreground">GCA — WDPV</p>
                  <p className="text-xs text-muted-foreground">Avtomobil boshiga nuqson</p>
                </div>
                <Link href="/dashboard/gca" className="text-xs text-primary hover:underline">Batafsil →</Link>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={gcaChart} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                  <XAxis dataKey="shop" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="actual" name="Haqiqiy" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Line dataKey="target" name="Maqsad" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-violet-400">D10 — Faktorlar</p>
                  <p className="text-xs text-muted-foreground">Sehlar bo'yicha</p>
                </div>
                <Link href="/dashboard/d10" className="text-xs text-primary hover:underline">Batafsil →</Link>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={dChart('d10')} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                  <XAxis dataKey="shop" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="F-50" name="F-50" stackId="a" fill="#dc2626" />
                  <Bar dataKey="F-20" name="F-20" stackId="a" fill="#ea580c" />
                  <Bar dataKey="F-10" name="F-10" stackId="a" fill="#ca8a04" />
                  <Bar dataKey="F-5"  name="F-5"  stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-indigo-400">D20 — Faktorlar</p>
                  <p className="text-xs text-muted-foreground">Sehlar bo'yicha</p>
                </div>
                <Link href="/dashboard/d20" className="text-xs text-primary hover:underline">Batafsil →</Link>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={dChart('d20')} margin={{ top: 4, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                  <XAxis dataKey="shop" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="F-50" name="F-50" stackId="a" fill="#dc2626" />
                  <Bar dataKey="F-20" name="F-20" stackId="a" fill="#ea580c" />
                  <Bar dataKey="F-10" name="F-10" stackId="a" fill="#ca8a04" />
                  <Bar dataKey="F-5"  name="F-5"  stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── 5. INSPEKTORLAR GRAFIGI ───────────────────────────────────────── */}
        {filteredQRecs.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="mb-4">
              <p className="text-sm font-bold text-foreground">Smena {activeShift} — Inspektorlar ko'rsatkichlari</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sehlar bo'yicha DRR, DRL, Incoming, PDI</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={SHOPS_ALL.map(shop => {
                  const sq = filteredQRecs.filter(r => r.shop === shop)
                  const se = shiftEntries.filter(e => e.shop === shop)
                  const d10 = filteredD10Recs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
                  const d20 = filteredD20Recs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
                  return {
                    shop:     shop.replace(' SHOP', '').replace('WELDING-', 'W-'),
                    DRR:      sq.filter(r => r.type === 'drr').reduce((s, r) => s + r.count, 0),
                    DRL:      sq.filter(r => r.type === 'drl').reduce((s, r) => s + r.count, 0),
                    D10:      d10,
                    D20:      d20,
                    Kiruvchi: se.reduce((s, e) => s + e.incoming, 0),
                    PDI:      sq.filter(r => r.type === 'pdi').reduce((s, r) => s + r.count, 0),
                  }
                })}
                margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                <XAxis dataKey="shop" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="DRR"      name="DRR"      fill="#ea580c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="DRL"      name="DRL"      fill="#ca8a04" radius={[3, 3, 0, 0]} />
                <Bar dataKey="D10"      name="D10"      fill="#7c3aed" radius={[3, 3, 0, 0]} />
                <Bar dataKey="D20"      name="D20"      fill="#4f46e5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Kiruvchi" name="Kiruvchi" fill="#0891b2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="PDI"      name="PDI"      fill="#16a34a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── 6. INSPEKTORLAR YOZUVLARI ─────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-base font-bold text-foreground">Smena {activeShift} — Inspektorlar yozuvlari</p>
                <p className="text-xs text-muted-foreground">Faqat kuzatuv · {activeDate}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-foreground">{filteredQRecs.length}</p>
              <p className="text-xs text-muted-foreground">ta yozuv</p>
            </div>
          </div>

          {filteredQRecs.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground text-sm">
              Bu smena uchun inspektorlar hali ma'lumot kiritmagan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-5 py-3 text-left text-sm font-semibold text-muted-foreground">Seh</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Sektor</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-orange-400">Tur</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Nuqson nomi</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Soni</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Faktor</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-muted-foreground">Inspektor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredQRecs.map(r => (
                    <tr key={r.id} className="hover:bg-muted/15 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-foreground">{r.shop}</td>
                      <td className="px-4 py-3">
                        {r.sector
                          ? <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">{r.sector}</span>
                          : <span className="text-sm text-muted-foreground/50">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                          r.type === 'drr' ? 'bg-orange-500/15 text-orange-600 border-orange-500/40' :
                          r.type === 'drl' ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/40' :
                          r.type === 'gca' ? 'bg-blue-500/15   text-blue-600   border-blue-500/40'   :
                                             'bg-purple-500/15 text-purple-600 border-purple-500/40'
                        }`}>{r.type.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{r.codeName}</p>
                        <p className="text-xs text-muted-foreground">{r.code}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-base font-bold text-foreground">{r.count}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                          r.factor === 50 ? 'bg-rose-500/15   text-rose-600   border-rose-500/40'   :
                          r.factor === 20 ? 'bg-orange-500/15 text-orange-600 border-orange-500/40' :
                          r.factor === 10 ? 'bg-blue-500/15   text-blue-600   border-blue-500/40'   :
                                            'bg-emerald-500/15 text-emerald-600 border-emerald-500/40'
                        }`}>{r.factor}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{r.createdByName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 7. SEKTORLAR TAHLILI ─────────────────────────────────────────── */}
        {filteredQRecs.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-foreground">Sektorlar bo'yicha tahlil</p>
                <p className="text-xs text-muted-foreground mt-0.5">Smena {activeShift} · {activeDate}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px]">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-5 py-3 text-left text-sm font-semibold text-muted-foreground">Seh</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Sektor</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-orange-400">DRR</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-yellow-400">DRL</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-purple-400">PDI</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Jami</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-rose-400">F-50</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground">Og'irlik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {SHOPS_ALL.flatMap(shop => {
                    const shopSectors = SHOP_LINES[shop as ShopType] ?? []
                    const shopQRecs   = filteredQRecs.filter(r => r.shop === shop)
                    if (!shopQRecs.length) return []
                    return shopSectors.map(sector => {
                      const secRecs = shopQRecs.filter(r => r.sector === sector)
                      if (!secRecs.length) {
                        const ua = shopQRecs.filter(r => !r.sector)
                        if (sector !== shopSectors[0] || !ua.length) return null
                        return (
                          <tr key={`${shop}-ua`} className="hover:bg-muted/15">
                            <td className="px-5 py-3 text-sm font-semibold text-foreground">{shop.replace(' SHOP','')}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground italic">Tayinlanmagan</td>
                            <td className="px-4 py-3 text-center text-sm text-muted-foreground">{ua.filter(r=>r.type==='drr').reduce((s,r)=>s+r.count,0)||'—'}</td>
                            <td className="px-4 py-3 text-center text-sm text-muted-foreground">{ua.filter(r=>r.type==='drl').reduce((s,r)=>s+r.count,0)||'—'}</td>
                            <td className="px-4 py-3 text-center text-sm text-muted-foreground">{ua.filter(r=>r.type==='pdi').reduce((s,r)=>s+r.count,0)||'—'}</td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-foreground">{ua.reduce((s,r)=>s+r.count,0)}</td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-rose-400">{ua.filter(r=>r.factor===50).reduce((s,r)=>s+r.count,0)||'—'}</td>
                            <td className="px-4 py-3 text-center text-sm text-muted-foreground">{ua.reduce((s,r)=>s+r.count*r.factor,0)}</td>
                          </tr>
                        )
                      }
                      const drr  = secRecs.filter(r=>r.type==='drr').reduce((s,r)=>s+r.count,0)
                      const drl  = secRecs.filter(r=>r.type==='drl').reduce((s,r)=>s+r.count,0)
                      const pdi  = secRecs.filter(r=>r.type==='pdi').reduce((s,r)=>s+r.count,0)
                      const tot  = secRecs.reduce((s,r)=>s+r.count,0)
                      const f50  = secRecs.filter(r=>r.factor===50).reduce((s,r)=>s+r.count,0)
                      const ogir = secRecs.reduce((s,r)=>s+r.count*r.factor,0)
                      return (
                        <tr key={`${shop}-${sector}`} className="hover:bg-muted/15">
                          <td className="px-5 py-3 text-sm font-semibold text-foreground">{shop.replace(' SHOP','')}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">{sector}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{drr||'—'}</td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{drl||'—'}</td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{pdi||'—'}</td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-foreground">{tot}</td>
                          <td className="px-4 py-3 text-center">
                            {f50>0
                              ? <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/40">{f50}</span>
                              : <span className="text-sm text-muted-foreground/50">—</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-muted-foreground font-medium">{ogir}</td>
                        </tr>
                      )
                    }).filter(Boolean)
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 8. TEZKOR HAVOLALAR ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/gca',               label: 'GCA Dashboard',       color: 'border-blue-700/60   hover:border-blue-500',    dot: 'bg-blue-500'    },
            { href: '/dashboard/d10',               label: 'D10 Dashboard',       color: 'border-violet-700/60 hover:border-violet-500',  dot: 'bg-violet-500'  },
            { href: '/dashboard/d20',               label: 'D20 Dashboard',       color: 'border-indigo-700/60 hover:border-indigo-500',  dot: 'bg-indigo-500'  },
            { href: '/dashboard/engineer-analysis', label: "Muhandislar tahlili", color: 'border-emerald-700/60 hover:border-emerald-500', dot: 'bg-emerald-500' },
          ].map(({ href, label, color, dot }) => (
            <Link
              key={href}
              href={href}
              className={`bg-card border ${color} rounded-xl p-4 flex items-center gap-3 transition-all hover:bg-muted/20 group`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Ko'rish →</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

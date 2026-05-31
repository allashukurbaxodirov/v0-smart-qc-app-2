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
  RefreshCw, Package, Eye, X, ExternalLink, Car,
} from 'lucide-react'
import Link from 'next/link'

// ─── DRL GSIP Types ────────────────────────────────────────────────────────────
interface DrlTotals {
  row_count: number; total_count: number; damas_count: number; labo_count: number
  date_from: string; date_to: string; shift_from: string; shift_to: string; file_name: string
}
interface DrlShop  { shop: string;  total: number }
interface DrlFault {
  fault_code: string; fault_name: string; total_count: number; drl_ratio_sum: number
  model_damas: number; model_labo: number; top_shop: string; top_prod_team: string
}
interface DrlStats {
  batchId:   string
  totals:    DrlTotals
  byShop:    DrlShop[]
  byPartLv1: { part_lv1: string; total: number }[]
  top10:     DrlFault[]
}

// ─── DRR GSIP Types ────────────────────────────────────────────────────────────
interface DrrTotals {
  row_count: number; total_count: number; total_veh: number
  damas_count: number; labo_count: number
  date_from: string; date_to: string; shift_from: string; shift_to: string
}
interface DrrShop { shop: string; total: number; veh_total: number }
interface DrrStats {
  batchId: string
  totals:  DrrTotals
  byShop:  DrrShop[]
}

// ─── GCA GSIP Types ────────────────────────────────────────────────────────────
interface GcaGsipShop {
  shop: string; wdpv: number; total_weight: number; veh_count: number
}
interface GcaGsipTotals {
  wdpv: number; total_weight: number; veh_count: number
  date_from: string; date_to: string
}
interface GcaGsipStats {
  batchId: string
  totals:  GcaGsipTotals
  byShop:  GcaGsipShop[]
}

// ─── Config ────────────────────────────────────────────────────────────────────
const DEFAULT_GCA_TARGETS: Record<string, number> = {
  'PRESS SHOP': 0.40, 'WELDING-1': 0.45,
  'WELDING-2':  0.45, 'PAINT SHOP': 0.70, 'GA': 0.50,
}
const DEFAULT_PLANT_TARGET = 2.5
const DEFAULT_VEHICLES     = 50

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

// GSIP shop name mapping: WELDING-1 / WELDING-2 → WELDING
function gsipShopName(shop: string): string {
  return shop.startsWith('WELDING') ? 'WELDING' : shop
}

// ─── Shift label ──────────────────────────────────────────────────────────────
function shiftLbl(s: string) {
  if (s === 'E') return 'Erta'
  if (s === 'N') return 'Tun'
  if (s === 'L') return 'Kech'
  return s
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

// ─── DRL kliklanadigan katak ──────────────────────────────────────────────────
function DrlCell({ v, st, onClick }: { v: number; st: Status; onClick: () => void }) {
  return (
    <td className="px-3 py-3.5 text-center">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold border transition-all cursor-pointer hover:scale-105 hover:shadow-md ${ST[st].pill} hover:ring-1 hover:ring-yellow-400/50`}
        title="DRL drilldown ko'rish"
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ST[st].dot}`} />
        {v}
      </button>
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

  // ── DRL GSIP drilldown ────────────────────────────────────────────────────
  const [drlOpen,      setDrlOpen]      = useState(false)
  const [drlShopFilter,setDrlShopFilter]= useState<string>('')
  const [drlStats,     setDrlStats]     = useState<DrlStats | null>(null)
  const [drlLoading,   setDrlLoading]   = useState(false)
  const [drlEmpty,     setDrlEmpty]     = useState(false)
  const [openEscCount, setOpenEscCount] = useState(0)

  const loadDrlStats = useCallback(async () => {
    setDrlLoading(true)
    setDrlEmpty(false)
    try {
      const res  = await fetch('/api/drl-import/stats')
      const data = await res.json()
      if (data.empty || !data.totals) { setDrlEmpty(true); setDrlStats(null) }
      else setDrlStats(data)
    } catch { setDrlEmpty(true) }
    finally  { setDrlLoading(false) }
  }, [])

  // ── DRR GSIP ─────────────────────────────────────────────────────────────
  const [drrStats,   setDrrStats]   = useState<DrrStats | null>(null)
  const [drrLoading, setDrrLoading] = useState(false)
  const [drrEmpty,   setDrrEmpty]   = useState(false)

  const loadDrrStats = useCallback(async () => {
    setDrrLoading(true)
    setDrrEmpty(false)
    try {
      const res  = await fetch('/api/drr-import/stats')
      const data = await res.json()
      if (data.empty || !data.totals) { setDrrEmpty(true); setDrrStats(null) }
      else setDrrStats(data)
    } catch { setDrrEmpty(true) }
    finally  { setDrrLoading(false) }
  }, [])

  // ── GCA GSIP ──────────────────────────────────────────────────────────────
  const [gcaGsipStats,   setGcaGsipStats]   = useState<GcaGsipStats | null>(null)
  const [gcaGsipEmpty,   setGcaGsipEmpty]   = useState(false)

  const loadGcaGsipStats = useCallback(async () => {
    try {
      const res  = await fetch('/api/gca-import/stats')
      const data = await res.json()
      if (data.empty || !data.totals) { setGcaGsipEmpty(true); setGcaGsipStats(null) }
      else { setGcaGsipStats(data); setGcaGsipEmpty(false) }
    } catch { setGcaGsipEmpty(true) }
  }, [])

  const loadEscCount = useCallback(async () => {
    try {
      const res = await fetch('/api/drl-escalations?status=open')
      if (res.ok) {
        const data = await res.json()
        setOpenEscCount(Array.isArray(data) ? data.length : 0)
      }
    } catch {}
  }, [])

  useEffect(() => { loadDrlStats(); loadDrrStats(); loadGcaGsipStats(); loadEscCount() }, [loadDrlStats, loadDrrStats, loadGcaGsipStats, loadEscCount])

  // Har 30 soniyada eskalatsiya sonini yangilash
  useEffect(() => {
    const id = setInterval(loadEscCount, 30_000)
    return () => clearInterval(id)
  }, [loadEscCount])

  const openDrl = (shop?: string) => {
    setDrlShopFilter(shop ?? '')
    setDrlOpen(true)
    if (!drlStats && !drlLoading) loadDrlStats()
  }
  // Dynamic GCA targets — DB dan yuklash (SuperAdmin panel o'zgartiradi)
  const [targetsVer, setTargetsVer] = useState(0)
  useEffect(() => {
    const apply = async () => {
      try {
        const res  = await fetch('/api/wdpv-settings')
        const data = res.ok ? await res.json() : null
        if (data?.targets) {
          Object.assign(GCA_TARGETS, data.targets)
          PLANT_TARGET = data.targets['PLANT'] ?? DEFAULT_PLANT_TARGET
          VEHICLES     = Number(data.vehicles)  || DEFAULT_VEHICLES
        } else {
          // fallback localStorage
          try {
            const t = localStorage.getItem('gca_wdpv_targets_v1')
            const v = localStorage.getItem('gca_vehicles_v1')
            if (t) { const p = JSON.parse(t); Object.assign(GCA_TARGETS, p); PLANT_TARGET = p.PLANT ?? DEFAULT_PLANT_TARGET }
            if (v) VEHICLES = Number(v) || DEFAULT_VEHICLES
          } catch {}
        }
      } catch {
        try {
          const t = localStorage.getItem('gca_wdpv_targets_v1')
          const v = localStorage.getItem('gca_vehicles_v1')
          if (t) { const p = JSON.parse(t); Object.assign(GCA_TARGETS, p); PLANT_TARGET = p.PLANT ?? DEFAULT_PLANT_TARGET }
          if (v) VEHICLES = Number(v) || DEFAULT_VEHICLES
        } catch {}
      }
      setTargetsVer(v => v + 1)
    }
    apply()
    // Har 60 soniyada qayta yuklash
    const interval = setInterval(apply, 60_000)
    return () => clearInterval(interval)
  }, [])

  const { records: gcaRecs,  loading: gcaLoad, refresh: gcaRefresh }   = useGCA()
  const { records: dAllRecs, loading: dLoad,   refresh: dRefresh   }   = useDRecords()
  const { entries: allShiftEntries } = useShift()
  const { records: qRecs, refresh: qRefresh }                          = useQRecords()
  const { records: incomingRecs, refresh: incomingRefresh }            = useIncoming()

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [refreshing,  setRefreshing]  = useState(false)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([gcaRefresh(), dRefresh(), qRefresh(), incomingRefresh(), loadEscCount(), loadGcaGsipStats(), loadDrrStats(), loadDrlStats()])
    setLastUpdated(new Date())
    setRefreshing(false)
  }, [gcaRefresh, dRefresh, qRefresh, incomingRefresh, loadEscCount, loadGcaGsipStats, loadDrrStats, loadDrlStats])

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
    // GCA WDPV: GSIP import dan (agar mavjud) → fallback: qo'lda kiritilgan
    const gsipKey     = gsipShopName(shop)  // WELDING-1/WELDING-2 → WELDING
    const gsipGcaRow  = gcaGsipStats?.byShop.find(s => s.shop === gsipKey)
    const gcaCnt      = filteredGcaRecs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
    const wdpv        = gsipGcaRow
      ? Number(gsipGcaRow.wdpv)
      : (VEHICLES > 0 ? gcaCnt / VEHICLES : 0)
    const gs      = gcaSt(wdpv, shop)
    const d10cnt  = filteredD10Recs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
    const d20cnt  = filteredD20Recs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
    const shopQR  = filteredQRecs.filter(r => r.shop === shop)
    const drr     = shopQR.filter(r => r.type === 'drr').reduce((s, r) => s + r.count, 0)
    const drl     = shopQR.filter(r => r.type === 'drl').reduce((s, r) => s + r.count, 0)
    const pdi     = shopQR.filter(r => r.type === 'pdi').reduce((s, r) => s + r.count, 0)
    const inc     = shiftEntries.filter(e => e.shop === shop).reduce((s, e) => s + e.incoming, 0)
    // GSIP DRR/DRL
    const gsipDrr = drrStats?.byShop.find(s => s.shop === gsipKey)?.total ?? 0
    const gsipDrl = drlStats?.byShop.find(s => s.shop === gsipKey)?.total ?? 0
    // Umumiy holat
    const ov = overall(gs, drrSt(gsipDrr), drlSt(gsipDrl), pdiSt(pdi))
    return { shop, wdpv, gs, d10cnt, d20cnt, drr, drl, inc, pdi, gsipDrr, gsipDrl, ov }
  }), [filteredGcaRecs, filteredD10Recs, filteredD20Recs, filteredQRecs, shiftEntries, targetsVer, drrStats, drlStats, gcaGsipStats])

  const plant = useMemo(() => ({
    wdpv: gcaGsipStats
      ? Number(gcaGsipStats.totals.wdpv)
      : (VEHICLES > 0 ? filteredGcaRecs.reduce((s, r) => s + r.count, 0) / VEHICLES : 0),
    d10:           filteredD10Recs.reduce((s, r) => s + r.count, 0),
    d20:           filteredD20Recs.reduce((s, r) => s + r.count, 0),
    drr:           filteredQRecs.filter(r => r.type === 'drr').reduce((s, r) => s + r.count, 0),
    drl:           filteredQRecs.filter(r => r.type === 'drl').reduce((s, r) => s + r.count, 0),
    pdi:           filteredQRecs.filter(r => r.type === 'pdi').reduce((s, r) => s + r.count, 0),
    incomingTotal: filteredIncoming.reduce((s, r) => s + r.totalCount,  0),
    incomingDefect:filteredIncoming.reduce((s, r) => s + r.defectCount, 0),
  }), [filteredGcaRecs, filteredD10Recs, filteredD20Recs, filteredQRecs, filteredIncoming, targetsVer, gcaGsipStats])

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


  const critCount = shopMetrics.filter(s => s.ov === 'crit').length
  const warnCount = shopMetrics.filter(s => s.ov === 'warn').length

  const kpiCards = [
    { label: 'GCA WDPV',         value: plant.wdpv.toFixed(2), st: (plant.wdpv <= PLANT_TARGET ? 'ok' : plant.wdpv <= PLANT_TARGET * 1.5 ? 'warn' : 'crit') as Status, sub: `Maqsad ≤ ${PLANT_TARGET}`,  icon: <Activity className="w-5 h-5" /> },
    { label: 'D10',               value: String(plant.d10),     st: dCntSt(plant.d10),   sub: 'Nuqsonlar soni',       icon: <Layers className="w-5 h-5" /> },
    { label: 'D20',               value: String(plant.d20),     st: dCntSt(plant.d20),   sub: 'Nuqsonlar soni',       icon: <Layers className="w-5 h-5" /> },
    { label: 'DRR',               value: drrStats ? String(drrStats.totals.total_count) : String(plant.drr), st: drrSt(drrStats?.totals.total_count ?? plant.drr), sub: drrStats ? `GSIP: ${drrStats.totals.date_from}` : 'Rad etilgan', icon: <TrendingDown className="w-5 h-5" /> },
    { label: 'DRL',               value: drlStats ? String(drlStats.totals.total_count) : String(plant.drl), st: drlSt(plant.drl), sub: drlStats ? `GSIP: ${drlStats.totals.date_from}` : 'Qayta ishlangan', icon: <TrendingUp className="w-5 h-5" />, clickable: true },
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
            <span suppressHydrationWarning className="hidden sm:block text-xs text-muted-foreground">
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
          {kpiCards.map(({ label, value, st, sub, icon, clickable }: { label: string; value: string; st: Status; sub: string; icon: React.ReactNode; clickable?: boolean }) => (
            <div
              key={label}
              onClick={clickable ? () => openDrl() : undefined}
              className={`relative bg-card border rounded-xl p-4 overflow-hidden transition-all
                ${ST[st].border}
                ${clickable ? 'cursor-pointer hover:scale-[1.03] hover:shadow-lg hover:border-yellow-400/60 group' : ''}
                ${clickable && drlOpen && !drlShopFilter ? 'ring-2 ring-yellow-400/50' : ''}
              `}
            >
              {/* Chap chiziq */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${ST[st].dot}`} />
              <div className={`mb-2 ${ST[st].text}`}>{icon}</div>
              <p className="text-xs text-muted-foreground mb-0.5 font-medium">{label}</p>
              <p className={`text-2xl font-bold ${ST[st].text}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              {clickable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className="w-3.5 h-3.5 text-yellow-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── DRL GSIP DRILLDOWN PANEL ─────────────────────────────────────── */}
        {drlOpen && (
          <div className="bg-card border border-yellow-500/30 rounded-2xl overflow-hidden shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 bg-yellow-500/5 border-b border-yellow-500/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">DRL — Direct Run Loss</h2>
                  <p className="text-xs text-muted-foreground">
                    {drlStats
                      ? `GSIP import: ${drlStats.totals.date_from} · ${shiftLbl(drlStats.totals.shift_from)}→${shiftLbl(drlStats.totals.shift_to)} smena`
                      : 'GSIP ma\'lumotlari'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Shop filter chips */}
                {drlStats && (
                  <div className="hidden sm:flex items-center gap-1">
                    <button
                      onClick={() => setDrlShopFilter('')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        !drlShopFilter ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >Hammasi</button>
                    {drlStats.byShop.map(s => (
                      <button key={s.shop}
                        onClick={() => setDrlShopFilter(drlShopFilter === s.shop ? '' : s.shop)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          drlShopFilter === s.shop ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-card border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >{s.shop} ({s.total})</button>
                    ))}
                  </div>
                )}
                <Link href="/dashboard/drl">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg text-xs font-semibold hover:bg-yellow-500/20 transition-all">
                    <ExternalLink className="w-3 h-3" /> To'liq
                  </button>
                </Link>
                <button onClick={() => setDrlOpen(false)}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            {drlLoading && (
              <div className="flex items-center justify-center py-12 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-yellow-400" />
                <span className="text-sm text-muted-foreground">GSIP ma'lumotlari yuklanmoqda...</span>
              </div>
            )}

            {drlEmpty && !drlLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <TrendingUp className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Hali GSIP import qilinmagan</p>
                <Link href="/dashboard/drl-admin">
                  <button className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg text-xs font-semibold hover:bg-yellow-500/20 transition-all">
                    Excel yuklash →
                  </button>
                </Link>
              </div>
            )}

            {drlStats && !drlLoading && (() => {
              const filtTop10 = drlShopFilter
                ? drlStats.top10.filter(f => f.top_shop === drlShopFilter)
                : drlStats.top10
              const filtShops = drlShopFilter
                ? drlStats.byShop.filter(s => s.shop === drlShopFilter)
                : drlStats.byShop
              const filtTotal = drlShopFilter
                ? (drlStats.byShop.find(s => s.shop === drlShopFilter)?.total ?? 0)
                : drlStats.totals.total_count
              const maxCount = filtTop10[0]?.total_count ?? 1

              return (
                <div className="p-5 space-y-5">
                  {/* KPI row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Jami nuqsonlar', value: filtTotal.toLocaleString(),                      color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                      { label: 'DAMAS (R7)',      value: drlStats.totals.damas_count.toLocaleString(),    color: 'text-blue-300',   bg: 'bg-blue-500/10 border-blue-500/20' },
                      { label: 'LABO (R7A)',       value: drlStats.totals.labo_count.toLocaleString(),    color: 'text-green-300',  bg: 'bg-green-500/10 border-green-500/20' },
                      { label: 'Qatorlar',         value: drlStats.totals.row_count.toLocaleString(),     color: 'text-slate-300',  bg: 'bg-muted/30 border-border' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`rounded-xl border px-4 py-3 ${bg}`}>
                        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                    {/* Top 10 table — wider */}
                    <div className="lg:col-span-3 space-y-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-foreground">
                          Top {filtTop10.length} Ko&apos;p Takrorlangan Nuqsonlar
                        </p>
                        {drlShopFilter && (
                          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded text-xs">
                            {drlShopFilter}
                          </span>
                        )}
                      </div>
                      {filtTop10.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Bu seh uchun top nuqsonlar yo'q</p>
                      ) : (
                        <div className="space-y-1.5">
                          {filtTop10.map((f, i) => {
                            const barW = Math.round((f.total_count / maxCount) * 100)
                            const rankBg = i === 0 ? 'bg-red-600' : i === 1 ? 'bg-red-500' : i === 2 ? 'bg-orange-500' : i < 6 ? 'bg-amber-500' : 'bg-blue-500'
                            const shopColors: Record<string,string> = {
                              'WELDING': 'bg-sky-600 text-white', 'PAINT SHOP': 'bg-violet-600 text-white',
                              'GA': 'bg-emerald-600 text-white', 'PRESS SHOP': 'bg-amber-600 text-white'
                            }
                            return (
                              <div key={f.fault_code+i} className="flex items-center gap-2 bg-muted/20 hover:bg-muted/30 rounded-lg px-3 py-2 transition-colors">
                                <span className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${rankBg}`}>{i+1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {f.fault_code !== '—' && (
                                      <span className="font-mono text-xs text-primary">{f.fault_code}</span>
                                    )}
                                    <span className="text-xs text-foreground truncate">{f.fault_name}</span>
                                    <span className={`ml-auto px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${shopColors[f.top_shop] ?? 'bg-muted/30 text-muted-foreground'}`}>
                                      {f.top_shop}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${rankBg} opacity-70`} style={{ width: `${barW}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-foreground flex-shrink-0">{f.total_count}</span>
                                    <span className="text-xs text-blue-300 flex-shrink-0 hidden sm:block">{f.model_damas}D</span>
                                    <span className="text-xs text-green-300 flex-shrink-0 hidden sm:block">{f.model_labo}L</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right: shop + model breakdown */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Shop breakdown */}
                      <div>
                        <p className="text-sm font-bold text-foreground mb-2">Sexlar bo&apos;yicha</p>
                        <div className="space-y-2">
                          {drlStats.byShop.map(s => {
                            const pct = drlStats.totals.total_count > 0
                              ? Math.round((s.total / drlStats.totals.total_count) * 100) : 0
                            const dotMap: Record<string,string> = {
                              'WELDING':'bg-sky-400','PAINT SHOP':'bg-violet-400','GA':'bg-emerald-400','PRESS SHOP':'bg-amber-400'
                            }
                            const dot = dotMap[s.shop] ?? 'bg-slate-400'
                            const isActive = drlShopFilter === s.shop
                            return (
                              <button key={s.shop}
                                onClick={() => setDrlShopFilter(isActive ? '' : s.shop)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                                  isActive ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border bg-muted/10 hover:bg-muted/20'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                                <span className="text-xs font-semibold text-foreground flex-1">{s.shop}</span>
                                <span className="text-xs font-bold text-foreground">{s.total.toLocaleString()}</span>
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                                  <div className={`h-full rounded-full ${dot}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Model breakdown */}
                      <div>
                        <p className="text-sm font-bold text-foreground mb-2">Model bo&apos;yicha</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                            <Car className="w-4 h-4 text-blue-300 mx-auto mb-1" />
                            <p className="text-lg font-bold text-blue-300">{drlStats.totals.damas_count.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">DAMAS (R7)</p>
                          </div>
                          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                            <Car className="w-4 h-4 text-green-300 mx-auto mb-1" />
                            <p className="text-lg font-bold text-green-300">{drlStats.totals.labo_count.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">LABO (R7A)</p>
                          </div>
                        </div>
                      </div>

                      {/* Top part categories */}
                      <div>
                        <p className="text-sm font-bold text-foreground mb-2">Qism kategoriyalari</p>
                        <div className="space-y-1.5">
                          {drlStats.byPartLv1.slice(0, 5).map(p => {
                            const pct = drlStats.totals.total_count > 0
                              ? Math.round((p.total / drlStats.totals.total_count) * 100) : 0
                            return (
                              <div key={p.part_lv1} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{p.part_lv1}</span>
                                <div className="w-20 h-1 bg-muted rounded-full overflow-hidden flex-shrink-0">
                                  <div className="h-full bg-yellow-500/70 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-foreground w-8 text-right">{p.total}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── 3. SEHLAR HOLATI + INCOMING ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5">

          {/* Sehlar jadvali */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
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
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="px-5 py-3 text-left text-sm font-semibold text-muted-foreground w-40">Seh nomi</th>
                    <th className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-blue-400">GCA</span>
                      <span className="block text-xs text-muted-foreground font-normal">WDPV</span>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-orange-400">DRR</span>
                      <span className="block text-xs text-orange-500/60 font-normal">GSIP</span>
                    </th>
                    <th className="px-3 py-3 text-center cursor-pointer group" onClick={() => openDrl()}>
                      <span className="text-sm font-semibold text-yellow-400 group-hover:underline">DRL</span>
                      <span className="block text-xs text-yellow-500/60 font-normal">↗ GSIP</span>
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
                    <tr key={m.shop} className={`transition-colors hover:bg-muted/20 ${ST[m.ov].row}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ST[m.ov].dot}`} />
                          <span className="text-sm font-semibold text-foreground">{m.shop}</span>
                        </div>
                      </td>
                      <MCell v={parseFloat(m.wdpv.toFixed(2))} st={m.gs} f2 />
                      <MCell v={m.gsipDrr} st={drrSt(m.gsipDrr)} />
                      <DrlCell v={m.gsipDrl} st={drlSt(m.gsipDrl)} onClick={() => openDrl(gsipShopName(m.shop))} />
                      <MCell v={m.pdi} st={pdiSt(m.pdi)} />
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-3 py-1 rounded-md text-sm font-semibold border ${ST[m.ov].pill}`}>
                          {ST[m.ov].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-2.5 border-t border-border bg-muted/10 text-xs text-muted-foreground">
              DRR / DRL — GSIP import ma'lumotlari
            </div>
          </div>

        </div>

        {/* ── 3.5 D10 / D20 ALOHIDA PANEL ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">D10 / D20 — Nuqsonlar</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Press Shop · Welding-1 · Welding-2 · Smena {activeShift} · {activeDate}</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/d10" className="text-xs text-violet-400 hover:underline">D10 →</Link>
              <Link href="/dashboard/d20" className="text-xs text-indigo-400 hover:underline">D20 →</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {D_SHOPS.map(shop => {
              const d10 = filteredD10Recs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
              const d20 = filteredD20Recs.filter(r => r.shop === shop).reduce((s, r) => s + r.count, 0)
              const d10s = dCntSt(d10)
              const d20s = dCntSt(d20)
              // Faktor taqsimoti
              const d10F50 = filteredD10Recs.filter(r => r.shop === shop && r.factor === 50).reduce((s,r)=>s+r.count,0)
              const d10F20 = filteredD10Recs.filter(r => r.shop === shop && r.factor === 20).reduce((s,r)=>s+r.count,0)
              const d10F10 = filteredD10Recs.filter(r => r.shop === shop && r.factor === 10).reduce((s,r)=>s+r.count,0)
              const d10F5  = filteredD10Recs.filter(r => r.shop === shop && r.factor === 5).reduce((s,r)=>s+r.count,0)
              const d20F50 = filteredD20Recs.filter(r => r.shop === shop && r.factor === 50).reduce((s,r)=>s+r.count,0)
              const d20F20 = filteredD20Recs.filter(r => r.shop === shop && r.factor === 20).reduce((s,r)=>s+r.count,0)
              const d20F10 = filteredD20Recs.filter(r => r.shop === shop && r.factor === 10).reduce((s,r)=>s+r.count,0)
              const d20F5  = filteredD20Recs.filter(r => r.shop === shop && r.factor === 5).reduce((s,r)=>s+r.count,0)
              return (
                <div key={shop} className="p-5">
                  <p className="text-sm font-bold text-foreground mb-4">
                    {shop.replace(' SHOP', '').replace('WELDING-', 'WELDING ')}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* D10 */}
                    <div className={`rounded-xl border px-4 py-3 ${ST[d10s].border} ${ST[d10s].bg}`}>
                      <p className="text-xs text-muted-foreground mb-0.5 font-medium">D10</p>
                      <p className={`text-2xl font-bold ${ST[d10s].text}`}>{d10}</p>
                    </div>
                    {/* D20 */}
                    <div className={`rounded-xl border px-4 py-3 ${ST[d20s].border} ${ST[d20s].bg}`}>
                      <p className="text-xs text-muted-foreground mb-0.5 font-medium">D20</p>
                      <p className={`text-2xl font-bold ${ST[d20s].text}`}>{d20}</p>
                    </div>
                  </div>
                  {/* Faktor breakdown */}
                  {(d10 > 0 || d20 > 0) && (
                    <div className="space-y-1.5">
                      {[
                        { label: 'F-50', d10: d10F50, d20: d20F50, color: 'bg-rose-500' },
                        { label: 'F-20', d10: d10F20, d20: d20F20, color: 'bg-orange-500' },
                        { label: 'F-10', d10: d10F10, d20: d20F10, color: 'bg-amber-500' },
                        { label: 'F-5',  d10: d10F5,  d20: d20F5,  color: 'bg-emerald-500' },
                      ].filter(f => f.d10 > 0 || f.d20 > 0).map(f => (
                        <div key={f.label} className="flex items-center gap-2 text-xs">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.color}`} />
                          <span className="text-muted-foreground w-8">{f.label}</span>
                          <span className="text-violet-300 w-10">D10: {f.d10}</span>
                          <span className="text-indigo-300">D20: {f.d20}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {d10 === 0 && d20 === 0 && (
                    <p className="text-xs text-muted-foreground/50 italic">Bu smena uchun ma'lumot yo'q</p>
                  )}
                </div>
              )
            })}
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
                          </tr>
                        )
                      }
                      const drr  = secRecs.filter(r=>r.type==='drr').reduce((s,r)=>s+r.count,0)
                      const drl  = secRecs.filter(r=>r.type==='drl').reduce((s,r)=>s+r.count,0)
                      const pdi  = secRecs.filter(r=>r.type==='pdi').reduce((s,r)=>s+r.count,0)
                      const tot  = secRecs.reduce((s,r)=>s+r.count,0)
                      const f50  = secRecs.filter(r=>r.factor===50).reduce((s,r)=>s+r.count,0)
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
            { href: '/dashboard/gca',               label: 'GCA Dashboard',       color: 'border-blue-700/60   hover:border-blue-500',    dot: 'bg-blue-500',    badge: null },
            { href: '/dashboard/d10',               label: 'D10 Dashboard',       color: 'border-violet-700/60 hover:border-violet-500',  dot: 'bg-violet-500',  badge: null },
            { href: '/dashboard/d20',               label: 'D20 Dashboard',       color: 'border-indigo-700/60 hover:border-indigo-500',  dot: 'bg-indigo-500',  badge: null },
            { href: '/dashboard/engineer-analysis', label: "Muhandislar tahlili", color: openEscCount > 0 ? 'border-red-600/70 hover:border-red-500' : 'border-emerald-700/60 hover:border-emerald-500', dot: openEscCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500', badge: openEscCount > 0 ? openEscCount : null },
          ].map(({ href, label, color, dot, badge }) => (
            <Link
              key={href}
              href={href}
              className={`relative bg-card border ${color} rounded-xl p-4 flex items-center gap-3 transition-all hover:bg-muted/20 group`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Ko&apos;rish →</p>
              </div>
              {badge !== null && (
                <span className="flex-shrink-0 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/page-header'
import {
  ChevronLeft, TrendingDown, AlertTriangle, RefreshCw,
  Car, Layers, Building2, FileSpreadsheet, Activity,
  CheckCircle, X, Search, Calendar, TrendingUp, BarChart2,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GcaStats {
  batchId:    string
  batchInfo:  { imported_by: string; file_name: string; date_from: string; date_to: string; shift_from: string; shift_to: string } | null
  totals: {
    row_count:    number
    total_weight: number
    veh_count:    number
    wdpv:         number
    damas_weight: number
    labo_weight:  number
    damas_veh:    number
    labo_veh:     number
    date_from:    string
    date_to:      string
  }
  byShop: {
    shop:         string
    row_count:    number
    total_weight: number
    veh_count:    number
    wdpv:         number
    f50:          number
    f20:          number
    f10:          number
    f5:           number
  }[]
  byModel:    { model_label: string; model_group: string; total_weight: number; veh_count: number; wdpv: number }[]
  byPartLv1:  { part_lv1: string; row_count: number; total_weight: number; veh_count: number }[]
  byCategory: { category: string; row_count: number; total_weight: number }[]
  top10:      Top10Fault[]
}

interface Top10Fault {
  rank:          number
  fault_code:    string
  fault_name:    string
  total_weight:  number
  total_veh:     number
  veh_damas:     number
  veh_labo:      number
  top_prod_team: string
  top_shop:      string
  top_part_lv1:  string
}

interface GcaBatch {
  id:           string
  imported_at:  string
  file_name:    string
  date_from:    string
  date_to:      string
  shift_from:   string
  shift_to:     string
  shift_label:  string | null
  total_weight: number
  veh_count:    number
}

// ─── Overview types ───────────────────────────────────────────────────────────
interface ShiftSummary {
  shift_label:  string
  batch_count:  number
  total_weight: number
  veh_count:    number
  wdpv:         number
  last_import:  string
}
interface TrendPoint {
  date:         string
  imported_at:  string
  shift_label:  string
  imported_by:  string
  file_name:    string
  batch_id:     string
  total_weight: number
  veh_count:    number
  wdpv:         number
}
interface OverviewTotals {
  batch_count:  number
  total_weight: number
  veh_count:    number
  wdpv:         number
  date_from:    string
  date_to:      string
}
interface OverviewData {
  byShift: ShiftSummary[]
  trend:   TrendPoint[]
  totals:  OverviewTotals
}

// ─── Drilldown types ──────────────────────────────────────────────────────────
interface DrillRow {
  part_lv2:   string
  part_lv3:   string
  fault_code: string
  fault_name: string
  defect_note:string
  shop:       string
  gca_weight: number
  veh_count:  number
}
interface DrillData { lv1: string; rows: DrillRow[] }

// ─── 2026 WDPV Targets — Targets 2026.xlsx (GCA sheet, combined DAMAS+LABO) ──
// Columns: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
const WDPV_MONTHLY: Record<string, number[]> = {
  'PRESS SHOP':  [23.4,22.7,22.1,21.7,21.2,20.7,19.8,19.0,18.4,17.7,17.3,17.3],
  'WELDING':     [135.2,134.1,133.4,131.7,130.3,128.8,127.8,127.0,126.2,125.2,124.3,124.3],
  'PAINT SHOP':  [44.0,43.4,42.6,42.0,41.6,41.1,40.6,39.8,38.8,38.1,37.4,37.4],
  'GA':          [114.2,113.0,112.1,111.1,110.1,109.1,108.1,107.3,106.5,105.4,104.5,104.5],
  'SQE':         [109.5,108.8,108.1,107.1,105.8,104.7,103.4,102.6,101.8,100.7,99.8,99.8],
  'SQ':          [109.5,108.8,108.1,107.1,105.8,104.7,103.4,102.6,101.8,100.7,99.8,99.8],
  'QE':          [1.9,1.9,1.9,1.9,1.8,1.8,1.8,1.8,1.7,1.7,1.7,1.7],
  'SupplyChain': [6.6,6.6,6.6,6.6,6.5,6.5,6.4,6.4,6.4,6.1,6.1,6.1],
  'Boshqalar':   [16.8,16.5,15.9,15.7,15.5,15.0,14.8,14.7,14.6,13.9,13.8,13.8],
}
const WDPV_MONTHLY_DAMAS: Record<string, number[]> = {
  'PRESS SHOP':  [24.2,23.5,23.0,22.5,22.0,21.5,20.5,19.5,18.8,18.0,17.5,17.5],
  'WELDING':     [146.1,143.1,142.0,140.1,138.6,137.0,136.0,135.0,134.0,133.0,132.2,132.2],
  'PAINT SHOP':  [45.9,44.9,44.0,43.5,43.0,42.5,42.0,41.0,39.8,39.0,38.2,38.2],
  'GA':          [121.8,119.3,118.1,117.0,116.0,115.0,114.0,113.0,112.0,110.8,110.0,110.0],
  'SQE':         [125.9,123.3,122.0,121.0,119.6,118.4,117.0,116.0,115.0,114.0,113.5,113.5],
  'SQ':          [125.9,123.3,122.0,121.0,119.6,118.4,117.0,116.0,115.0,114.0,113.5,113.5],
  'QE':          [2.1,2.1,2.1,2.1,2.1,2.0,2.0,2.0,2.0,2.0,2.0,2.0],
  'SupplyChain': [8.1,8.0,8.0,8.0,7.9,7.9,7.8,7.8,7.7,7.5,7.5,7.5],
  'Boshqalar':   [0.9,0.8,0.8,0.8,0.8,0.7,0.7,0.7,0.7,0.7,0.5,0.5],
}
const WDPV_MONTHLY_LABO: Record<string, number[]> = {
  'PRESS SHOP':  [20.8,19.8,18.8,18.8,17.9,17.5,17.0,17.0,16.8,16.7,16.5,16.5],
  'WELDING':     [102.3,101.3,100.3,99.3,98.3,97.5,96.5,96.3,96.2,96.0,95.8,95.8],
  'PAINT SHOP':  [39.0,38.0,37.0,36.0,36.0,35.5,35.0,35.0,34.8,34.7,34.5,34.5],
  'GA':          [91.2,90.2,89.2,88.2,87.2,86.5,85.5,85.3,85.2,85.1,84.8,84.8],
  'SQE':         [55.7,55.7,54.7,53.7,52.7,52.0,51.0,50.9,50.8,50.6,50.5,50.5],
  'SQ':          [55.7,55.7,54.7,53.7,52.7,52.0,51.0,50.9,50.8,50.6,50.5,50.5],
  'QE':          [0.9,0.9,0.9,0.9,0.8,0.8,0.8,0.8,0.7,0.7,0.7,0.7],
  'SupplyChain': [1.3,1.3,1.3,1.3,1.3,1.2,1.2,1.2,1.2,1.0,1.0,1.0],
  'Boshqalar':   [74.8,73.8,73.8,72.8,71.8,70.0,69.0,68.5,68.3,68.2,68.0,68.0],
}
// Faktor 10 targets — Targets 2026.xlsx (GCA 10F sheet, combined DAMAS+LABO)
const F10_MONTHLY: Record<string, number[]> = {
  'PRESS SHOP':  [21.5,21.3,21.3,20.9,20.7,20.7,20.4,20.2,20.1,20.0,19.6,19.6],
  'WELDING':     [60.2,60.1,60.0,59.7,59.6,59.4,59.0,58.8,58.6,58.3,57.8,57.8],
  'PAINT SHOP':  [10.0,9.9,9.8,9.5,9.3,9.2,9.0,8.8,8.8,8.7,8.7,8.7],
  'GA':          [46.4,46.3,46.1,45.7,45.6,45.3,45.0,44.7,44.6,44.3,43.9,43.9],
  'SQE':         [43.2,42.9,42.8,42.6,42.5,42.2,41.9,41.8,41.6,41.1,40.5,40.5],
  'SQ':          [43.2,42.9,42.8,42.6,42.5,42.2,41.9,41.8,41.6,41.1,40.5,40.5],
  'QE':          [1.6,1.6,1.5,1.5,1.5,1.5,1.4,1.4,1.4,1.4,1.3,1.3],
  'SupplyChain': [4.3,4.3,4.2,4.2,4.2,4.2,4.1,4.1,4.1,4.1,4.1,4.1],
  'Boshqalar':   [0,0,0,0,0,0,0,0,0,0,0,0],
}
const F10_MONTHLY_DAMAS: Record<string, number[]> = {
  'PRESS SHOP':  [21.8,21.6,21.5,21.3,21.1,21.0,20.9,20.7,20.6,20.5,20.0,20.0],
  'WELDING':     [64.3,64.1,64.0,63.8,63.6,63.4,63.2,62.9,62.6,62.4,62.0,62.0],
  'PAINT SHOP':  [10.0,9.9,9.8,9.6,9.4,9.3,9.2,9.1,9.0,9.0,9.0,9.0],
  'GA':          [48.1,48.0,47.7,47.5,47.3,47.0,46.8,46.5,46.3,46.0,45.6,45.6],
  'SQE':         [48.7,48.4,48.2,48.0,47.8,47.5,47.3,47.2,46.9,46.5,46.0,46.0],
  'SQ':          [48.7,48.4,48.2,48.0,47.8,47.5,47.3,47.2,46.9,46.5,46.0,46.0],
  'QE':          [1.8,1.8,1.7,1.7,1.7,1.7,1.6,1.6,1.6,1.6,1.5,1.5],
  'SupplyChain': [5.3,5.2,5.1,5.1,5.1,5.1,5.0,5.0,5.0,5.0,5.0,5.0],
  'Boshqalar':   [0,0,0,0,0,0,0,0,0,0,0,0],
}
const F10_MONTHLY_LABO: Record<string, number[]> = {
  'PRESS SHOP':  [20.4,20.4,20.4,19.4,19.4,19.4,18.4,18.4,18.4,18.2,18.0,18.0],
  'WELDING':     [45.0,45.0,45.0,44.0,44.0,44.0,43.0,43.0,43.0,42.8,42.6,42.6],
  'PAINT SHOP':  [10.0,10.0,10.0,9.0,9.0,9.0,8.0,8.0,8.0,7.8,7.6,7.6],
  'GA':          [40.0,40.0,40.0,39.0,39.0,39.0,38.0,38.0,38.0,37.8,37.6,37.6],
  'SQE':         [23.0,23.0,23.0,22.0,22.0,22.0,21.0,21.0,21.0,20.8,20.6,20.6],
  'SQ':          [23.0,23.0,23.0,22.0,22.0,22.0,21.0,21.0,21.0,20.8,20.6,20.6],
  'QE':          [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
  'SupplyChain': [0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8,0.8],
  'Boshqalar':   [0,0,0,0,0,0,0,0,0,0,0,0],
}

const MONTHS_UZ = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek']

const SHOP_COLORS: Record<string, string> = {
  'WELDING':     'bg-sky-600 text-white border-sky-500',
  'PAINT SHOP':  'bg-violet-600 text-white border-violet-500',
  'GA':          'bg-emerald-600 text-white border-emerald-500',
  'PRESS SHOP':  'bg-amber-600 text-white border-amber-500',
  'SQ':          'bg-rose-600 text-white border-rose-500',
  'SQE':         'bg-pink-600 text-white border-pink-500',
  'QE':          'bg-cyan-600 text-white border-cyan-500',
  'SupplyChain': 'bg-teal-600 text-white border-teal-500',
  'Boshqalar':   'bg-slate-600 text-white border-slate-500',
}
const SHOP_HEX: Record<string, string> = {
  'WELDING':     '#0284c7',
  'PAINT SHOP':  '#7c3aed',
  'GA':          '#059669',
  'PRESS SHOP':  '#d97706',
  'SQ':          '#e11d48',
  'SQE':         '#db2777',
  'QE':          '#0891b2',
  'SupplyChain': '#0d9488',
  'Boshqalar':   '#64748b',
}

function rankColor(r: number) {
  if (r === 1) return 'bg-red-600'
  if (r === 2) return 'bg-red-500'
  if (r === 3) return 'bg-orange-500'
  if (r <= 6)  return 'bg-amber-500'
  return 'bg-blue-500'
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GCAPage() {
  const [stats,    setStats]    = useState<GcaStats | null>(null)
  const [batches,  setBatches]  = useState<GcaBatch[]>([])
  const [selBatch, setSelBatch] = useState('')
  const [selShift, setSelShift] = useState<'all' | 'A' | 'B' | 'D'>('all')
  const [loading,  setLoading]  = useState(true)
  const [empty,    setEmpty]    = useState(false)
  const [session,  setSession]  = useState<{ role: string } | null>(null)

  // Date range — Barchasi tab (overview)
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10))

  // A/B/D shift — date filter mode
  type GcaFilterMode = 'batch' | 'kunlik' | 'oylik' | 'yillik'
  const todayGca  = new Date().toISOString().split('T')[0]
  const [gcaFilterMode, setGcaFilterMode] = useState<GcaFilterMode>('batch')
  const [gcaDate,   setGcaDate]   = useState(todayGca)
  const [gcaMonth,  setGcaMonth]  = useState(todayGca.substring(0, 7))
  const [gcaYear,   setGcaYear]   = useState(todayGca.substring(0, 4))

  function gcaDateRange(mode: GcaFilterMode) {
    if (mode === 'kunlik') return { from: gcaDate, to: gcaDate }
    if (mode === 'oylik') {
      const [y, m] = gcaMonth.split('-').map(Number)
      const last   = new Date(y, m, 0).getDate()
      return { from: `${gcaMonth}-01`, to: `${gcaMonth}-${String(last).padStart(2, '0')}` }
    }
    if (mode === 'yillik') return { from: `${gcaYear}-01-01`, to: `${gcaYear}-12-31` }
    return null
  }

  // Overview (Barchasi tab)
  const [overview,        setOverview]        = useState<OverviewData | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)

  // Drilldown
  const [drill,        setDrill]        = useState<DrillData | null>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [drillSearch,  setDrillSearch]  = useState('')

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])

  // Batch list yuklash (alohida funksiya — Yangilash tugmasi ham chaqiradi)
  const loadBatches = useCallback(async (currentShift = selShift) => {
    try {
      const res  = await fetch('/api/gca-import')
      const data: GcaBatch[] = res.ok ? await res.json() : []
      setBatches(data)
      const list = currentShift === 'all' ? data : data.filter(b => b.shift_label === currentShift)
      if (list.length > 0) {
        setSelBatch(list[0].id)
      } else if (data.length > 0 && currentShift !== 'all') {
        // Tanlangan smena uchun batch yo'q — barchani ko'rsat
        setSelBatch(data[0].id)
      } else {
        setSelBatch('')
        setStats(null)
        setEmpty(true)
        setLoading(false)
      }
    } catch {
      setEmpty(true)
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selShift])

  useEffect(() => { loadBatches() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Shift bo'yicha filtrlangan batchlar
  const filteredBatches = selShift === 'all'
    ? batches
    : batches.filter(b => b.shift_label === selShift)

  // Shift o'zgarganda — filtrlangan ro'yxatdan birinchi batch tanlash
  useEffect(() => {
    if (batches.length === 0) return
    const list = selShift === 'all' ? batches : batches.filter(b => b.shift_label === selShift)
    if (list.length > 0) {
      setSelBatch(list[0].id)
    } else {
      setSelBatch('')
      setStats(null)
      setEmpty(true)
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selShift])

  // Stats
  const loadStats = useCallback(async (params: { batch?: string; from?: string; to?: string; shift?: string }) => {
    if (!params.batch && !params.from) return
    setLoading(true)
    setEmpty(false)
    try {
      let url = '/api/gca-import/stats'
      if (params.batch) {
        url = `/api/gca-import/stats?batch=${params.batch}`
      } else if (params.from && params.to) {
        const p = new URLSearchParams({ from: params.from, to: params.to })
        if (params.shift) p.set('shift', params.shift)
        url = `/api/gca-import/stats?${p}`
      }
      const res  = await fetch(url)
      const data = await res.json()
      if (data.empty || !data.totals) { setEmpty(true); setStats(null) }
      else setStats(data)
    } catch { setEmpty(true) }
    finally  { setLoading(false) }
  }, [])

  // Batch mode
  useEffect(() => {
    if (gcaFilterMode !== 'batch') return
    if (selBatch) loadStats({ batch: selBatch })
    else if (batches.length === 0 && !loading) setEmpty(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcaFilterMode, selBatch])

  // Date mode for A/B/D tabs
  useEffect(() => {
    if (gcaFilterMode === 'batch' || selShift === 'all') return
    const range = gcaDateRange(gcaFilterMode)
    if (range) loadStats({ ...range, shift: selShift })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcaFilterMode, gcaDate, gcaMonth, gcaYear, selShift])

  // Overview fetch (sanalar bo'yicha umumiy ko'rinish)
  const loadOverview = useCallback(async (from = dateFrom, to = dateTo) => {
    setOverviewLoading(true)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      const res = await fetch(`/api/gca-import/overview?${params}`)
      if (res.ok) setOverview(await res.json())
    } catch { /* ignore */ }
    finally { setOverviewLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  // selShift === 'all' bo'lganda yoki sana o'zgarganda overview yuklash
  useEffect(() => {
    if (selShift === 'all') loadOverview()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selShift, dateFrom, dateTo])

  // Drilldown (part_lv1 kategoriya bo'yicha)
  const openDrill = async (lv1: string) => {
    if (!stats?.batchId) return
    setDrillLoading(true)
    setDrill(null)
    setDrillSearch('')
    try {
      const res  = await fetch(`/api/gca-import/drilldown?batch=${stats.batchId}&lv1=${encodeURIComponent(lv1)}`)
      const data = await res.json()
      if (data.rows) setDrill({ lv1, rows: data.rows })
    } finally { setDrillLoading(false) }
  }

  const isAdmin = session && ['superadmin', 'admin'].includes(session.role)

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!loading && empty) return (
    <div className="min-h-screen bg-background">
      <PageHeader title="GCA Dashboard" description="GCA WDPV — GSIP import ma'lumotlari"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'GCA Dashboard' }]} />
      <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
        <FileSpreadsheet className="w-14 h-14 text-muted-foreground" />
        <p className="text-foreground font-semibold">Hali GSIP GCA import qilinmagan</p>
        <p className="text-sm text-muted-foreground">GCA ma'lumotlarini ko'rish uchun Excel faylni yuklang</p>
        {isAdmin && (
          <Link href="/dashboard/gca-admin">
            <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all">
              Excel yuklash →
            </button>
          </Link>
        )}
      </div>
    </div>
  )

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="GCA Dashboard"
        description="WDPV — Weighted Defects Per Vehicle · GSIP import ma'lumotlari"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'GCA Dashboard' }]}
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
            {/* Shift filter tabs */}
            <div className="flex items-center bg-muted/40 border border-border rounded-lg p-0.5 gap-0.5">
              {(['all', 'A', 'B', 'D'] as const).map(s => {
                const count = s === 'all' ? batches.length : batches.filter(b => b.shift_label === s).length
                return (
                  <button
                    key={s}
                    onClick={() => setSelShift(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      selShift === s
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s === 'all' ? 'Barchasi' : `${s} smena`}
                    {count > 0 && (
                      <span className={`ml-1.5 text-[10px] px-1 py-0.5 rounded-full ${
                        selShift === s ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                      }`}>{count}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Sana filtri — faqat Barchasi tabida ko'rinadi */}
            {selShift === 'all' && (
              <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  type="date" value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="bg-transparent text-xs text-foreground outline-none w-28"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <input
                  type="date" value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="bg-transparent text-xs text-foreground outline-none w-28"
                />
              </div>
            )}

            {/* A/B/D tab — filter mode tabs */}
            {selShift !== 'all' && (
              <div className="flex items-center bg-muted/40 border border-border rounded-xl p-1 gap-1">
                {([
                  { key: 'batch',  label: 'Hammasi' },
                  { key: 'kunlik', label: 'Kunlik' },
                  { key: 'oylik',  label: 'Oylik' },
                  { key: 'yillik', label: 'Yillik' },
                ] as { key: GcaFilterMode; label: string }[]).map(m => (
                  <button key={m.key}
                    onClick={() => setGcaFilterMode(m.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      gcaFilterMode === m.key
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Batch dropdown */}
            {selShift !== 'all' && gcaFilterMode === 'batch' && filteredBatches.length > 0 && (
              <select value={selBatch} onChange={e => setSelBatch(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground">
                {filteredBatches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.date_from} — {b.shift_label ? `Smena ${b.shift_label} · ` : ''}{b.shift_from}→{b.shift_to} ({Number(b.total_weight).toFixed(0)} og'irlik · {b.veh_count} avto)
                  </option>
                ))}
              </select>
            )}

            {/* Kunlik picker */}
            {selShift !== 'all' && gcaFilterMode === 'kunlik' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input type="date" value={gcaDate} onChange={e => setGcaDate(e.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none" />
              </div>
            )}

            {/* Oylik picker */}
            {selShift !== 'all' && gcaFilterMode === 'oylik' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input type="month" value={gcaMonth} onChange={e => setGcaMonth(e.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none" />
              </div>
            )}

            {/* Yillik picker */}
            {selShift !== 'all' && gcaFilterMode === 'yillik' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <select value={gcaYear} onChange={e => setGcaYear(e.target.value)}
                  className="bg-transparent text-sm text-foreground outline-none">
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={() => {
              if (selShift === 'all') loadBatches()
              else if (gcaFilterMode === 'batch') loadStats({ batch: selBatch })
              else {
                const range = gcaDateRange(gcaFilterMode)
                if (range) loadStats({ ...range, shift: selShift })
              }
            }}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
            </button>
            {isAdmin && (
              <Link href="/dashboard/gca-admin">
                <button className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Yangi Import
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        )}

        {/* ══ BARCHASI TAB — Overview (smena solishtirish + trend) ══════════ */}
        {selShift === 'all' && !loading && (
          <div className="space-y-6">

            {overviewLoading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
              </div>
            )}

            {overview && !overviewLoading && (() => {
              // ── Trend data: sana bo'yicha smena WDPV (BarChart) ──────────
              type ChartRow = { date: string; A?: number; B?: number; D?: number; X?: number }
              const dateMap = new Map<string, { A: number[]; B: number[]; D: number[]; X: number[] }>()
              for (const pt of overview.trend) {
                const key = pt.date.slice(5) // MM-DD
                if (!dateMap.has(key)) dateMap.set(key, { A: [], B: [], D: [], X: [] })
                const e = dateMap.get(key)!
                const sl = pt.shift_label
                if (sl === 'A') e.A.push(Number(pt.wdpv))
                else if (sl === 'B') e.B.push(Number(pt.wdpv))
                else if (sl === 'D') e.D.push(Number(pt.wdpv))
                else e.X.push(Number(pt.wdpv))
              }
              const avg = (arr: number[]) => arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2) : undefined
              const trendData: ChartRow[] = Array.from(dateMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, s]) => ({
                  date,
                  A: avg(s.A),
                  B: avg(s.B),
                  D: avg(s.D),
                  X: avg(s.X),
                }))

              const hasAny = overview.byShift.length > 0 || overview.trend.length > 0

              return (
                <>
                  {/* ── Umumiy KPI row ──────────────────────────────────── */}
                  {hasAny && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { label: 'Plant WDPV',     value: Number(overview.totals.wdpv).toFixed(2),  icon: <TrendingUp className="w-5 h-5" />, color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
                        { label: 'Jami avtomobil', value: overview.totals.veh_count,                    icon: <Car className="w-5 h-5" />,           color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
                        { label: 'Batch soni',     value: overview.totals.batch_count,                  icon: <BarChart2 className="w-5 h-5" />,     color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/20' },
                      ].map(({ label, value, icon, color, bg }) => (
                        <div key={label} className={`rounded-xl border p-5 ${bg}`}>
                          <div className={`mb-2 ${color}`}>{icon}</div>
                          <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Smena solishtirish jadvali ──────────────────────── */}
                  <div>
                    <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                      Smena solishtirish jadvali
                    </h2>
                    {overview.byShift.length === 0 ? (
                      <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
                        Tanlangan sana oralig'ida ma'lumot yo'q
                      </div>
                    ) : (
                      <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border bg-muted/30">
                                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Smena</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">Batch</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">WDPV</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">Avtomobil</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">So'nggi import</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {overview.byShift.map(s => {
                                const wdpv   = Number(s.wdpv)
                                const target = 0.50   // umumiy WDPV chegarasi
                                const over   = wdpv > target
                                const badgeMap: Record<string, string> = {
                                  A: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
                                  B: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                                  D: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                                  '—': 'bg-muted/40 text-muted-foreground border-border',
                                }
                                const badge = badgeMap[s.shift_label] ?? badgeMap['—']
                                return (
                                  <tr key={s.shift_label} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-5 py-3">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${badge}`}>
                                        {s.shift_label === '—' ? 'Belgilanmagan' : `${s.shift_label} smena`}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 text-center text-sm font-semibold text-foreground">{s.batch_count}</td>
                                    <td className="px-5 py-3 text-center">
                                      <span className={`text-lg font-bold ${over ? 'text-red-400' : 'text-green-400'}`}>{wdpv.toFixed(2)}</span>
                                    </td>
                                    <td className="px-5 py-3 text-center text-sm text-foreground">{s.veh_count}</td>
                                    <td className="px-5 py-3 text-center text-xs text-muted-foreground">
                                      {s.last_import ? s.last_import.slice(0, 16).replace('T', ' ') : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
                                        over
                                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                                      }`}>
                                        {over ? <><AlertTriangle className="w-3 h-3" /> Yuqori</> : <><CheckCircle className="w-3 h-3" /> OK</>}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── WDPV Trend grafigi (BarChart) ───────────────────── */}
                  {trendData.length > 0 && (
                    <div>
                      <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        WDPV Trend grafigi
                        <span className="text-xs font-normal text-muted-foreground ml-1">— smena bo'yicha kunlik WDPV</span>
                      </h2>
                      <div className="bg-card border border-border rounded-2xl p-5">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barCategoryGap="30%" barGap={3}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              axisLine={{ stroke: 'hsl(var(--border))' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={v => Number(v).toFixed(0)}
                              domain={[0, 'auto']}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '10px',
                                color: 'hsl(var(--foreground))',
                                fontSize: '13px',
                              }}
                              formatter={(value: number, name: string) => [
                                Number(value).toFixed(2),
                                name === 'X' ? 'Belgilanmagan WDPV' : `${name} smena WDPV`,
                              ]}
                            />
                            <Legend
                              formatter={(value: string) => value === 'X' ? 'Belgilanmagan' : `${value} smena`}
                              wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, paddingTop: 8 }}
                            />
                            <Bar dataKey="A" name="A" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 11, fill: '#6366f1', formatter: (v: number) => v ? v.toFixed(0) : '' }} />
                            <Bar dataKey="B" name="B" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 11, fill: '#0ea5e9', formatter: (v: number) => v ? v.toFixed(0) : '' }} />
                            <Bar dataKey="D" name="D" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 11, fill: '#10b981', formatter: (v: number) => v ? v.toFixed(0) : '' }} />
                            <Bar dataKey="X" name="X" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 11, fill: '#94a3b8', formatter: (v: number) => v ? v.toFixed(0) : '' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {stats && !loading && selShift !== 'all' && (
          <>
            {/* Meta bar */}
            <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
              <span className="px-2.5 py-1 bg-card border border-border rounded-full">
                📅 {stats.totals.date_from} → {stats.totals.date_to}
              </span>
              {stats.batchInfo?.file_name && (
                <span className="px-2.5 py-1 bg-card border border-border rounded-full truncate max-w-[220px]">
                  📁 {stats.batchInfo.file_name}
                </span>
              )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Plant WDPV',       value: Number(stats.totals.wdpv).toFixed(2),          icon: <Activity className="w-5 h-5" />,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
                { label: "Jami og'irlik",     value: Number(stats.totals.total_weight).toFixed(0),  icon: <AlertTriangle className="w-5 h-5" />, color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
                { label: 'Avtomobillar (VIN)',value: stats.totals.veh_count,                        icon: <Car className="w-5 h-5" />,           color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} className={`rounded-xl border p-5 ${bg}`}>
                  <div className={`mb-2 ${color}`}>{icon}</div>
                  <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Model taqsimoti */}
            {stats.byModel.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {stats.byModel.map(m => (
                  <div key={m.model_label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                    <Car className={`w-8 h-8 flex-shrink-0 ${m.model_group === 'R7' ? 'text-blue-400' : 'text-green-400'}`} />
                    <div>
                      <p className={`text-base font-bold ${m.model_group === 'R7' ? 'text-blue-400' : 'text-green-400'}`}>{m.model_label}</p>
                      <p className="text-2xl font-bold text-foreground">{Number(m.total_weight).toFixed(0)} <span className="text-sm font-normal text-muted-foreground">og'irlik</span></p>
                      <p className="text-xs text-muted-foreground">{m.veh_count} avto · WDPV {Number(m.wdpv).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Faktor taqsimoti jadvali ─────────────────────────────── */}
            {(() => {
              const curM = new Date().getMonth() // 0=Jan..11=Dec
              const mLabel = MONTHS_UZ[curM]
              return (
                <>
                  {/* ── WDPV Jami jadvali ──────────────────────────────────── */}
                  <div>
                    <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-indigo-500" />
                      Faktor bo&apos;yicha umumiy taqsimot
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3">
                      2026 {mLabel} target · DAMAS (B-150) va LABO (B-100) alohida
                    </p>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-red-400">F-50</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-orange-400">F-20</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-blue-400">F-10</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-green-400">F-5</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Avto</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-indigo-400">WDPV</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-blue-300">DAMAS target</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-green-300">LABO target</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {stats.byShop.map(s => {
                              const target      = WDPV_MONTHLY[s.shop]?.[curM] ?? 999
                              const tgtDamas    = WDPV_MONTHLY_DAMAS[s.shop]?.[curM]
                              const tgtLabo     = WDPV_MONTHLY_LABO[s.shop]?.[curM]
                              const wdpv        = Number(s.wdpv)
                              const over        = wdpv > target
                              return (
                                <tr key={s.shop} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-sm text-foreground">{s.shop}</td>
                                  <td className="px-4 py-3 text-center">
                                    {s.f50 > 0 ? <span className="font-bold text-red-400">{s.f50}</span> : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {s.f20 > 0 ? <span className="font-bold text-orange-400">{s.f20}</span> : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {s.f10 > 0 ? <span className="font-bold text-blue-400">{s.f10}</span> : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {s.f5 > 0 ? <span className="font-bold text-green-400">{s.f5}</span> : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-foreground">{s.veh_count}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`font-bold text-sm ${over ? 'text-red-400' : 'text-foreground'}`}>{wdpv.toFixed(2)}</span>
                                    {target < 999 && (
                                      <span className="block text-[10px] text-muted-foreground">≤ {target}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-blue-300">
                                    {tgtDamas != null ? tgtDamas.toFixed(1) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-green-300">
                                    {tgtLabo != null ? tgtLabo.toFixed(1) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${over ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                      {over ? <><AlertTriangle className="w-3 h-3" /> Yuqori</> : <><CheckCircle className="w-3 h-3" /> OK</>}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* ── Faktor 10 alohida jadvali ──────────────────────────── */}
                  <div>
                    <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-500" />
                      Faktor 10 bo&apos;yicha taqsimot
                    </h2>
                    <p className="text-xs text-muted-foreground mb-3">
                      2026 {mLabel} F-10 target · DAMAS va LABO alohida
                    </p>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sehi</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-blue-400">F-10 soni</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-indigo-400">F-10 WDPV</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Kombinat target</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-blue-300">DAMAS target</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-green-300">LABO target</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {stats.byShop.map(s => {
                              const f10wdpv  = s.veh_count > 0 ? (s.f10 * 10) / s.veh_count : 0
                              const target   = F10_MONTHLY[s.shop]?.[curM] ?? 999
                              const tgtDamas = F10_MONTHLY_DAMAS[s.shop]?.[curM]
                              const tgtLabo  = F10_MONTHLY_LABO[s.shop]?.[curM]
                              const over     = target < 999 && f10wdpv > target
                              return (
                                <tr key={s.shop} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-sm text-foreground">{s.shop}</td>
                                  <td className="px-4 py-3 text-center">
                                    {s.f10 > 0 ? <span className="font-bold text-blue-400">{s.f10}</span> : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`font-bold text-sm ${over ? 'text-red-400' : 'text-foreground'}`}>
                                      {f10wdpv.toFixed(2)}
                                    </span>
                                    {target < 999 && (
                                      <span className="block text-[10px] text-muted-foreground">≤ {target}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-foreground">
                                    {target < 999 ? target.toFixed(1) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-blue-300">
                                    {tgtDamas != null ? tgtDamas.toFixed(1) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-green-300">
                                    {tgtLabo != null ? tgtLabo.toFixed(1) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {target < 999 ? (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${over ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                        {over ? <><AlertTriangle className="w-3 h-3" /> Yuqori</> : <><CheckCircle className="w-3 h-3" /> OK</>}
                                      </span>
                                    ) : <span className="text-muted-foreground text-xs">—</span>}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* ── Sehlar bo'yicha — Pie chart ──────────────────────────── */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                Sehlar bo&apos;yicha og&apos;irlik taqsimoti
              </h2>
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-full md:w-[280px] h-[260px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.byShop.map(s => ({ ...s, total_weight: Number(s.total_weight) }))}
                          dataKey="total_weight" nameKey="shop"
                          cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3}>
                          {stats.byShop.map(s => (
                            <Cell key={s.shop} fill={SHOP_HEX[s.shop] ?? '#6366f1'} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, _: any, props: any) => {
                            const wdpv = Number(props?.payload?.wdpv ?? 0).toFixed(2)
                            return [`${Number(value).toFixed(0)} og'irlik · WDPV ${wdpv}`, '']
                          }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', color: 'hsl(var(--foreground))', fontSize: '13px' }}
                        />
                        <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle"
                          style={{ fill: 'hsl(var(--foreground))', fontSize: 22, fontWeight: 700 }}>
                          {Number(stats.totals.total_weight).toFixed(0)}
                        </text>
                        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle"
                          style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}>
                          jami og'irlik
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {stats.byShop.map(s => {
                      const totalW = Number(stats.totals.total_weight)
                      const pct    = totalW > 0 ? ((Number(s.total_weight) / totalW) * 100).toFixed(1) : '0'
                      const hex    = SHOP_HEX[s.shop] ?? '#6366f1'
                      const target = WDPV_TARGETS[s.shop] ?? 0.5
                      const over   = Number(s.wdpv) > target
                      return (
                        <div key={s.shop} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background">
                          <div className="w-3 h-12 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">{s.shop}</p>
                            <p className="text-xl font-bold text-foreground leading-tight">
                              {Number(s.total_weight).toFixed(0)} <span className="text-xs font-normal text-muted-foreground">og'irlik</span>
                            </p>
                            <p className="text-xs font-semibold" style={{ color: hex }}>
                              WDPV {Number(s.wdpv).toFixed(2)}
                              <span className={`ml-2 ${over ? 'text-red-400' : 'text-green-400'}`}>{over ? '▲' : '✓'}</span>
                            </p>
                            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hex }} />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold" style={{ color: hex }}>{pct}%</p>
                            <p className="text-xs text-muted-foreground">{s.veh_count} avto</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Top 10 nuqsonlar ─────────────────────────────────────── */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-indigo-500" />
                Top 10 Ko&apos;p Takrorlangan Nuqsonlar
              </h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sexi</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">DAMAS</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">LABO</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Qism</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.top10.map(f => {
                        const maxW    = Number(stats.top10[0]?.total_weight ?? 1)
                        const barW    = Math.round((Number(f.total_weight) / maxW) * 100)
                        const shopCls = SHOP_COLORS[f.top_shop] ?? 'bg-muted/20 text-muted-foreground border-border'
                        return (
                          <tr key={f.rank} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${rankColor(f.rank)}`}>
                                {f.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-[220px]">
                              <div>
                                {f.fault_code !== '—' && (
                                  <span className="text-xs font-mono text-indigo-400 mr-1">{f.fault_code}</span>
                                )}
                                <span className="text-sm text-foreground">{f.fault_name}</span>
                              </div>
                              <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden w-full max-w-[160px]">
                                <div className={`h-full rounded-full ${rankColor(f.rank)} opacity-70`} style={{ width: `${barW}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${shopCls}`}>
                                {f.top_shop}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-foreground">{f.veh_damas}</td>
                            <td className="px-4 py-3 text-right text-sm text-foreground">{f.veh_labo}</td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground max-w-[100px] truncate">
                              {f.top_part_lv1}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Qism kategoriyalari ───────────────────────────────────── */}
            {stats.byPartLv1.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Qism kategoriyalari bo&apos;yicha (Top 10)
                  <span className="text-xs font-normal text-muted-foreground ml-1">— batafsil ko&apos;rish uchun bosing</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {stats.byPartLv1.slice(0, 10).map(p => {
                    const totalW = Number(stats.totals.total_weight)
                    const pct    = totalW > 0 ? Math.round((Number(p.total_weight) / totalW) * 100) : 0
                    return (
                      <button key={p.part_lv1} onClick={() => openDrill(p.part_lv1)}
                        className="bg-card border border-border rounded-xl p-3 text-left hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group cursor-pointer">
                        <p className="text-xs text-muted-foreground truncate mb-1 group-hover:text-indigo-400 transition-colors">{p.part_lv1}</p>
                        <p className="text-xl font-bold text-foreground">{Number(p.total_weight).toFixed(0)}</p>
                        <p className="text-xs text-indigo-400">{p.veh_count} mashina</p>
                        <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground">{pct}%</p>
                          <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">tafsilot →</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Drilldown Drawer ─────────────────────────────────────────────── */}
      {(drill || drillLoading) && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setDrill(null)} />
          <div className="w-full max-w-3xl bg-card border-l border-border flex flex-col h-full shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground text-base truncate">{drill?.lv1 ?? '...'}</h3>
                  {drill && (
                    <span className="text-xs text-muted-foreground">{drill.rows.length} ta yozuv</span>
                  )}
                </div>
              </div>
              <button onClick={() => setDrill(null)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors shrink-0 ml-3">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {drill && (
              <div className="px-6 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input value={drillSearch} onChange={e => setDrillSearch(e.target.value)}
                    placeholder="Qidirish: nuqson nomi, kodi..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
                  {drillSearch && (
                    <button onClick={() => setDrillSearch('')}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {drillLoading && (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
                </div>
              )}
              {drill && (() => {
                const search   = drillSearch.toLowerCase()
                const filtered = search
                  ? drill.rows.filter(r =>
                      r.fault_name.toLowerCase().includes(search) ||
                      r.fault_code.toLowerCase().includes(search) ||
                      r.defect_note.toLowerCase().includes(search) ||
                      r.part_lv2.toLowerCase().includes(search)
                    )
                  : drill.rows

                if (filtered.length === 0) return (
                  <div className="text-center py-16 text-sm text-muted-foreground">Hech narsa topilmadi</div>
                )

                const byLv2: Record<string, DrillRow[]> = {}
                for (const row of filtered) {
                  const lv2 = row.part_lv2 || '—'
                  if (!byLv2[lv2]) byLv2[lv2] = []
                  byLv2[lv2].push(row)
                }

                return (
                  <div className="divide-y divide-border">
                    {Object.entries(byLv2).map(([lv2, rows]) => (
                      <div key={lv2}>
                        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-2.5 bg-muted/60 backdrop-blur-sm border-b border-border">
                          <span className="text-sm font-bold text-foreground">{lv2}</span>
                          <span className="text-xs text-indigo-400 font-semibold">
                            {rows.reduce((s, r) => s + r.gca_weight, 0).toFixed(0)} og'irlik
                          </span>
                        </div>
                        <div className="divide-y divide-border/50">
                          {rows.map((row, idx) => {
                            const shopCls = SHOP_COLORS[row.shop] ?? 'bg-muted/20 text-muted-foreground border-border'
                            return (
                              <div key={idx} className="grid grid-cols-[1fr_1.6fr_auto_auto] gap-x-3 items-start px-6 py-3.5 hover:bg-muted/20 transition-colors">
                                <div className="min-w-0 pt-0.5">
                                  <p className="text-sm text-foreground">{row.part_lv3 || '—'}</p>
                                </div>
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-start gap-1.5 flex-wrap">
                                    {row.fault_code && row.fault_code !== '—' && (
                                      <span className="text-xs font-mono font-bold bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded shrink-0">{row.fault_code}</span>
                                    )}
                                    <span className="text-sm text-foreground font-medium">{row.fault_name}</span>
                                  </div>
                                  {row.defect_note && <p className="text-xs text-sky-300">📝 {row.defect_note}</p>}
                                </div>
                                <div className="flex justify-center pt-0.5">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold border whitespace-nowrap ${shopCls}`}>{row.shop}</span>
                                </div>
                                <div className="text-right pt-0.5">
                                  <span className="text-sm font-bold text-indigo-400">{row.gca_weight}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

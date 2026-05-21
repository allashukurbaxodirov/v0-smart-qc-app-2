'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA } from '@/lib/gca-context'
import { gcaDefectCodes, gcaShopOptions, gcaFactorOptions } from '@/lib/mock-data'
import { SHOP_LINES } from '@/lib/shift-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, Upload, Trash2, Check, Lock, Car,
  FileSpreadsheet, RefreshCw, AlertTriangle, CheckCircle2, X,
} from 'lucide-react'
import Link from 'next/link'
import CarDiagramModal, { type CarModel } from '@/components/dashboard/car-diagram-modal'

// ─── GSIP Import Types ────────────────────────────────────────────────────────
interface GCABatch {
  id:          string
  imported_at: string
  imported_by: string
  file_name:   string
  date_from:   string
  date_to:     string
  shift_from:  string
  shift_to:    string
  row_count:   number
  total_weight: number
  veh_count:   number
  status:      string
}

interface GCAImportPreview {
  ok:          boolean
  batchId:     string
  rowCount:    number
  totalWeight: number
  vehCount:    number
  skipped:     number
  warnings:    string[]
  meta:        { dateFrom: string; dateTo: string; shiftFrom: string; shiftTo: string; models: string[] }
}

// Three.js SSR muammosi — faqat brauzerda yuklash
const Damas3DModal = dynamic(
  () => import('@/components/dashboard/damas-3d-modal'),
  { ssr: false, loading: () => (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-blue-400">3D model yuklanmoqda...</p>
      </div>
    </div>
  )}
)

type ShopType = 'PRESS SHOP' | 'WELDING-1' | 'WELDING-2' | 'PAINT SHOP' | 'GA'

const LOCKED_ROLES = ['gca_auditor', 'cmm_inspector', 'ga_engineer', 'welding_engineer']

export default function GCAAdminPage() {
  const { records, addRecord, deleteRecord } = useGCA()
  const [showSuccess, setShowSuccess] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'shop' | 'factor'>('date')
  const [filterShop, setFilterShop] = useState<string>('')
  const [mainTab, setMainTab] = useState<'manual' | 'gsip'>('manual')

  // Session
  const [session, setSession] = useState<{ role: string; name?: string; shop: string | null; shift: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])
  const isLocked   = session ? LOCKED_ROLES.includes(session.role) : false
  const lockedShop = (isLocked && session?.shop) ? session.shop as ShopType : null
  const isAdmin    = session && ['superadmin', 'admin'].includes(session.role)

  // ── GSIP Import state ───────────────────────────────────────────────────────
  const [gsipFile,     setGsipFile]     = useState<File | null>(null)
  const [gsipDragOver, setGsipDragOver] = useState(false)
  const [gsipUploading, setGsipUploading] = useState(false)
  const [gsipPreview,  setGsipPreview]  = useState<GCAImportPreview | null>(null)
  const [gsipErr,      setGsipErr]      = useState('')
  const [gsipBatches,  setGsipBatches]  = useState<GCABatch[]>([])
  const [gsipLoading,  setGsipLoading]  = useState(false)
  const [deletingId,   setDeletingId]   = useState('')

  const loadGsipBatches = useCallback(async () => {
    setGsipLoading(true)
    try {
      const res = await fetch('/api/gca-import')
      if (res.ok) setGsipBatches(await res.json())
    } finally {
      setGsipLoading(false)
    }
  }, [])

  useEffect(() => { loadGsipBatches() }, [loadGsipBatches])

  const handleGsipFile = (f: File) => {
    if (!f.name.match(/\.xlsx?$/i)) {
      setGsipErr('Faqat .xlsx yoki .xls fayl qabul qilinadi')
      return
    }
    setGsipFile(f)
    setGsipPreview(null)
    setGsipErr('')
  }

  const handleGsipUpload = async () => {
    if (!gsipFile) return
    setGsipUploading(true)
    setGsipErr('')
    try {
      const fd = new FormData()
      fd.append('file', gsipFile)
      const res  = await fetch('/api/gca-import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setGsipErr(data.error ?? 'Xatolik'); return }
      setGsipPreview(data)
      setGsipFile(null)
      loadGsipBatches()
    } catch (e: any) {
      setGsipErr(e.message)
    } finally {
      setGsipUploading(false)
    }
  }

  const handleGsipDelete = async (batchId: string) => {
    if (!confirm("Bu GCA importni o'chirishni tasdiqlaysizmi?")) return
    setDeletingId(batchId)
    try {
      await fetch(`/api/gca-import?batch=${batchId}`, { method: 'DELETE' })
      loadGsipBatches()
      if (gsipPreview?.batchId === batchId) setGsipPreview(null)
    } finally {
      setDeletingId('')
    }
  }

  // Car model selection + diagram modals
  const [carModel,    setCarModel]    = useState<CarModel | null>(null)
  const [showDiagram, setShowDiagram] = useState(false)   // 2D plan view
  const [show3D,      setShow3D]      = useState(false)    // 3D modal

  // Form state
  const [formData, setFormData] = useState({
    shop:   'PRESS SHOP' as ShopType,
    sector: '',
    pono:   '',
    code:   '18',
    factor: 5,
    count:  1,
    notes:  '',
    image:  null as File | null,
  })

  useEffect(() => {
    if (lockedShop) setFormData(prev => ({ ...prev, shop: lockedShop, sector: '' }))
  }, [lockedShop])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'shop') {
      // Reset sector when shop changes
      setFormData((prev) => ({
        ...prev,
        shop: value as ShopType,
        sector: '',
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'factor' || name === 'count' ? (value === '' ? '' : parseInt(value) || 0) : value,
      }))
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedDefect = gcaDefectCodes.find((d) => d.code === formData.code)
    if (selectedDefect) {
      addRecord({
        shop:     formData.shop,
        sector:   formData.sector || null,
        pono:     formData.pono   || null,
        code:     formData.code,
        codeName: selectedDefect.name,
        factor:   formData.factor,
        count:    formData.count,
        notes:    formData.notes  || undefined,
        date:     new Date().toISOString().split('T')[0],
        shift:    session?.shift || 'A',
      })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      setFormData({
        shop:   'PRESS SHOP',
        sector: '',
        pono:   '',
        code:   '18',
        factor: 5,
        count:  1,
        notes:  '',
        image:  null,
      })
    }
  }

  // Called from diagram modal — adds record directly
  const handleDiagramAdd = ({
    zone, zoneNameUz, code, codeName, factor, count,
  }: {
    zone: string; zoneNameUz: string
    code: string; codeName: string
    factor: number; count: number
  }) => {
    addRecord({
      shop:     formData.shop,
      sector:   `${zone} — ${zoneNameUz}`,
      pono:     formData.pono || null,
      code,
      codeName,
      factor,
      count,
      notes:    `Model: ${carModel}`,
      date:     new Date().toISOString().split('T')[0],
      shift:    session?.shift || 'A',
    })
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const getRiskLevel = (factor: number) => {
    if (factor >= 50) return { label: 'Yuqori', color: 'bg-critical text-white' }
    if (factor >= 20) return { label: "O'rtacha", color: 'bg-warning text-white' }
    return { label: 'Past', color: 'bg-success text-white' }
  }

  const filteredRecords = records
    .filter((r) => !filterShop || r.shop === filterShop)
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'shop') return a.shop.localeCompare(b.shop)
      return b.factor - a.factor
    })

  const shopSectors = SHOP_LINES[formData.shop] ?? []

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="GCA Admin paneli"
        description="GCA nuqsonlarini qayd etish va boshqarish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'GCA Admin paneli' },
        ]}
      />

      <div className="p-6 space-y-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            Orqaga
          </Button>
        </Link>

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        <div className="inline-flex bg-card border border-border rounded-lg p-1 gap-1">
          {([
            { key: 'manual', label: 'Qo\'lda kiritish' },
            { key: 'gsip',   label: 'GSIP Import (GCA)' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mainTab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ GSIP Import tab ═══════════════════════════════════════════════ */}
        {mainTab === 'gsip' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Upload zone */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">GCA Excel yuklash (GSIP)</h2>
                </div>

                {/* Drop area */}
                <div
                  onDragOver={e => { e.preventDefault(); setGsipDragOver(true) }}
                  onDragLeave={() => setGsipDragOver(false)}
                  onDrop={e => { e.preventDefault(); setGsipDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleGsipFile(f) }}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    gsipDragOver
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                  onClick={() => document.getElementById('gsip-file-input')?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {gsipFile ? gsipFile.name : 'GCA Defect Details.xlsx'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag & drop yoki bosib fayl tanlang
                  </p>
                  <input
                    id="gsip-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleGsipFile(f) }}
                  />
                </div>

                {gsipFile && (
                  <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-2">
                    <span className="text-sm text-foreground font-medium truncate">{gsipFile.name}</span>
                    <button onClick={() => setGsipFile(null)} className="ml-2 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {gsipErr && (
                  <div className="flex items-center gap-2 bg-critical/10 border border-critical/30 rounded-lg px-4 py-2">
                    <AlertTriangle className="w-4 h-4 text-critical flex-shrink-0" />
                    <p className="text-sm text-critical">{gsipErr}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!gsipFile || gsipUploading}
                  onClick={handleGsipUpload}
                >
                  {gsipUploading ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Yuklanmoqda...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Yuklash</>
                  )}
                </Button>
              </div>

              {/* Preview result */}
              {gsipPreview && (
                <div className="bg-success/5 border border-success/30 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <h2 className="text-base font-bold text-success">Import muvaffaqiyatli!</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: 'Satrlar',        val: gsipPreview.rowCount },
                      { label: 'Jami og\'irlik',  val: gsipPreview.totalWeight },
                      { label: "Avtomobil (VIN)", val: gsipPreview.vehCount },
                      { label: "O'tkazib yuborilgan", val: gsipPreview.skipped },
                    ] as const).map(({ label, val }) => (
                      <div key={label} className="bg-card border border-border rounded-lg px-4 py-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-xl font-bold text-foreground">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 bg-card border border-border rounded-lg px-4 py-3">
                    <p><span className="font-medium">Sana:</span> {gsipPreview.meta.dateFrom} → {gsipPreview.meta.dateTo}</p>
                    <p><span className="font-medium">Smena:</span> {gsipPreview.meta.shiftFrom} → {gsipPreview.meta.shiftTo}</p>
                    <p><span className="font-medium">Modellar:</span> {gsipPreview.meta.models.join(', ')}</p>
                  </div>
                  {gsipPreview.warnings?.length > 0 && (
                    <div className="space-y-1">
                      {gsipPreview.warnings.map((w, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded px-3 py-2">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Batch history */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold text-foreground">Import tarixi</h2>
                <button
                  onClick={loadGsipBatches}
                  disabled={gsipLoading}
                  className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${gsipLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Vaqt</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Fayl</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Satrlar</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Og'irlik</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Avto</th>
                      {isAdmin && <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">O'chirish</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {gsipBatches.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          Hali import qilinmagan
                        </td>
                      </tr>
                    ) : gsipBatches.map(b => (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(b.imported_at).toLocaleString('uz-UZ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground max-w-[180px] truncate" title={b.file_name}>
                          {b.file_name}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                          {b.date_from} → {b.date_to}<br />
                          <span className="text-muted-foreground">Smena: {b.shift_from}→{b.shift_to}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-foreground">{b.row_count}</td>
                        <td className="px-4 py-3 text-center font-semibold text-foreground">{Number(b.total_weight).toFixed(0)}</td>
                        <td className="px-4 py-3 text-center font-semibold text-foreground">{b.veh_count}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-center">
                            <button
                              disabled={deletingId === b.id}
                              onClick={() => handleGsipDelete(b.id)}
                              className="p-1.5 hover:bg-critical/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-critical" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ Manual entry tab ══════════════════════════════════════════════ */}
        {mainTab === 'manual' && <>

        {showSuccess && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-success" />
            <p className="text-sm font-medium text-success">Ma&apos;lumot muvaffaqiyatli saqlandi</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
              <h2 className="text-lg font-bold text-foreground mb-6">Yangi yozuv qo&apos;shish</h2>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* 0. Car model selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-muted-foreground" />
                    Avtomobil modeli
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DAMAS', 'LABO'] as CarModel[]).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCarModel(prev => prev === m ? null : m)}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all
                          ${carModel === m
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background border-border text-foreground hover:border-primary/50'
                          }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                </div>

                {/* 1. PONO — model tanlanganidan keyin */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">PONO raqami</label>
                  <Input
                    type="text"
                    name="pono"
                    value={formData.pono}
                    onChange={handleInputChange}
                    placeholder="P-2024-001"
                    className="bg-background border-border font-mono"
                  />
                </div>

                {/* 2. Shop */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    Nuqson sexi *
                    {isLocked && lockedShop && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </label>
                  {isLocked && lockedShop ? (
                    <div className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {lockedShop}
                    </div>
                  ) : (
                    <select
                      name="shop"
                      value={formData.shop}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    >
                      {gcaShopOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 3. Sector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Sektor</label>
                  <select
                    name="sector"
                    value={formData.sector}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">— Sektorsiz —</option>
                    {shopSectors.map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Defect Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson kodi *</label>
                  <select
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    {gcaDefectCodes.map((defect) => (
                      <option key={defect.code} value={defect.code}>
                        {defect.code} - {defect.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Factor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Faktor *</label>
                  <select
                    name="factor"
                    value={formData.factor}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    {gcaFactorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Count */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson soni *</label>
                  <Input
                    type="number"
                    name="count"
                    value={formData.count}
                    onChange={handleInputChange}
                    min="1"
                    className="bg-background border-border"
                  />
                </div>

                {/* 7. Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson rasmi</label>
                  <label className="border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground text-center">
                      Rasm yuklang yoki drag-drop qiling
                    </span>
                    {formData.image && (
                      <span className="text-xs text-primary font-medium">{formData.image.name}</span>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {/* 8. Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Izoh</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Qo'shimcha malumot kiriting..."
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-none"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Saqlash
                </Button>
              </form>
            </div>
          </div>

          {/* Records Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <select
                value={filterShop}
                onChange={(e) => setFilterShop(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm"
              >
                <option value="">Barcha sehlar</option>
                {gcaShopOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm"
              >
                <option value="date">Sana bo'yicha</option>
                <option value="shop">Sexi bo'yicha</option>
                <option value="factor">Faktor bo'yicha</option>
              </select>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sexi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sektor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">PONO</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson kodi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson nomi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Soni</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Faktor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Xavflilik</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Harakat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                          Hali ma&apos;lumot yo&apos;q
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => {
                        const risk = getRiskLevel(record.factor)
                        return (
                          <tr key={record.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground">{record.date}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{record.shop}</td>
                            <td className="px-4 py-3 text-sm text-foreground">
                              {record.sector ? (
                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                  {record.sector}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-foreground">{record.pono || '—'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">{record.code}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{record.codeName}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{record.count}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">{record.factor}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className={risk.color}>{risk.label}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => deleteRecord(record.id)}
                                className="p-2 hover:bg-critical/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-critical" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Jami yozuvlar:</span> {filteredRecords.length}
              </p>
            </div>
          </div>
        </div>
        </>}
      </div>

      {/* 2D plan view modal */}
      {showDiagram && carModel && (
        <CarDiagramModal
          model={carModel}
          onClose={() => setShowDiagram(false)}
          onAdd={handleDiagramAdd}
        />
      )}

      {/* 3D model modal (DAMAS only) */}
      {show3D && (
        <Damas3DModal
          onClose={() => setShow3D(false)}
          onAdd={handleDiagramAdd}
        />
      )}
    </div>
  )
}

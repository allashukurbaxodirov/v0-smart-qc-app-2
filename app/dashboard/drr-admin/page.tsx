'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/page-header'
import {
  Upload, Trash2, CheckCircle2, AlertTriangle, FileSpreadsheet,
  ChevronLeft, Clock, X, RefreshCw, Eye,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportBatch {
  import_batch: string
  imported_at:  string
  imported_by:  string
  file_name:    string
  date_from:    string
  date_to:      string
  shift_from:   string
  shift_to:     string
  row_count:    number
  total_count:  number
  models:       string
  status:       string
}

interface ParsePreview {
  ok:          boolean
  importBatch: string
  rowCount:    number   // DB ga yozilgan aggregate satrlar
  rawCount:    number   // asl raw yozuvlar (har bir nuqson)
  totalCount:  number   // jami nuqsonlar soni
  totalVeh:    number   // unique mashina (PONO) soni
  skipped:     number
  warnings:    string[]
  meta:        { dateFrom: string; dateTo: string; shiftFrom: string; shiftTo: string; models: string[] }
  top10:       { rank: number; faultCode: string; faultName: string; totalCount: number; totalVehCnt: number; topShop: string }[]
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DRRAdminPage() {
  const [tab, setTab]         = useState<'import' | 'history'>('import')
  const [session, setSession] = useState<{ role: string; name: string; shift: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])

  // ── Import state ──────────────────────────────────────────────────────────
  const [file,          setFile]          = useState<File | null>(null)
  const [dragOver,      setDragOver]      = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [preview,       setPreview]       = useState<ParsePreview | null>(null)
  const [uploadErr,     setUploadErr]     = useState<string>('')
  const [batches,       setBatches]       = useState<ImportBatch[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [deletingId,    setDeletingId]    = useState<string>('')
  const [selSmena,      setSelSmena]      = useState<string>('')  // '' | 'A' | 'B' | 'D'

  const canUpload = session && ['superadmin', 'admin', 'drr_inspector'].includes(session.role)
  const isAdmin   = session && ['superadmin', 'admin'].includes(session.role)

  // Inspektorda smena avtomatik tanlanadi
  useEffect(() => {
    if (session?.role === 'drr_inspector' && session.shift) {
      setSelSmena(session.shift)
    }
  }, [session])

  // Load batches
  const loadBatches = useCallback(async () => {
    setLoadingBatches(true)
    try {
      const res = await fetch('/api/drr-import')
      if (res.ok) setBatches(await res.json())
    } finally {
      setLoadingBatches(false)
    }
  }, [])

  useEffect(() => { loadBatches() }, [loadBatches])

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = (f: File) => {
    if (!f.name.match(/\.xlsx?$/i)) {
      setUploadErr('Faqat .xlsx yoki .xls fayl qabul qilinadi')
      return
    }
    setFile(f)
    setPreview(null)
    setUploadErr('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setUploadErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (selSmena) fd.append('shift_label', selSmena)
      const res  = await fetch('/api/drr-import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadErr(data.error ?? 'Xatolik yuz berdi')
        return
      }
      setPreview(data)
      setFile(null)
      loadBatches()
    } catch (e: any) {
      setUploadErr(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (batchId: string) => {
    if (!confirm('Bu importni o\'chirishni tasdiqlaysizmi?')) return
    setDeletingId(batchId)
    try {
      await fetch(`/api/drr-import?batch=${batchId}`, { method: 'DELETE' })
      loadBatches()
      if (preview?.importBatch === batchId) setPreview(null)
    } finally {
      setDeletingId('')
    }
  }

  const shiftLabel = (s: string) => {
    if (s === 'E') return 'Erta (E)'
    if (s === 'N') return 'Tun (N)'
    if (s === 'L') return 'Kech (L)'
    return s
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="DRR Admin Paneli"
        description="Daily Rejection Rate — GSIP import va rad etilganlar boshqaruvi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'DRR Admin' },
        ]}
      />

      <div className="p-6 space-y-6">
        <Link href="/dashboard">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> Orqaga
          </button>
        </Link>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
          {([
            { key: 'import',  label: '📁 GSIP Import' },
            { key: 'history', label: '🕓 Import Tarixi' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: IMPORT ─────────────────────────────────────────────────── */}
        {tab === 'import' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground">GSIP DRR Pareto Excel</h2>
                  <p className="text-xs text-muted-foreground">Kunlik 24 soatlik eksport faylini yuklang</p>
                </div>
              </div>

              {/* Smena ko'rsatgich — inspektorda */}
              {session?.role === 'drr_inspector' && session.shift && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-bold text-primary">Smena {session.shift}</span>
                  <span className="text-xs text-muted-foreground ml-1">(avtomatik)</span>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDrop={canUpload ? handleDrop : undefined}
                onDragOver={canUpload ? (e) => { e.preventDefault(); setDragOver(true) } : undefined}
                onDragLeave={() => setDragOver(false)}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragOver
                    ? 'border-orange-500 bg-orange-500/5'
                    : file
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-border hover:border-orange-400/40'
                } ${!canUpload ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => {
                  if (!canUpload) return
                  document.getElementById('drr-file-input')?.click()
                }}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB — yuklashga tayyor
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
                    >
                      <X className="w-3 h-3" /> Bekor qilish
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      Faylni bu yerga tashlang yoki bosing
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DRRPareto.xlsx — GSIP dan eksport qilingan fayl
                    </p>
                  </div>
                )}
                <input
                  id="drr-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </div>

              {uploadErr && (
                <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3 flex items-center gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">{uploadErr}</p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading || !canUpload}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', boxShadow: '0 4px 20px #f9731630' }}
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Yuklanmoqda...
                  </span>
                ) : '📤 Import qilish'}
              </button>
            </div>

            {/* Preview after successful upload */}
            {preview && (
              <div className="bg-card border border-green-500/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="font-bold text-green-400">Import muvaffaqiyatli!</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Jami nuqson yozuvlari', value: (preview.rawCount ?? 0).toLocaleString() },
                    { label: 'Jami nuqsonlar',        value: preview.totalCount.toLocaleString() },
                    { label: 'Unique mashina (PONO)', value: (preview.totalVeh ?? 0).toLocaleString() },
                    { label: 'Sana',                  value: preview.meta.dateFrom },
                    { label: 'Smena',                 value: `${shiftLabel(preview.meta.shiftFrom)} → ${shiftLabel(preview.meta.shiftTo)}` },
                    { label: 'Modellar',              value: preview.meta.models.join(', ') },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-semibold text-foreground text-sm">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Top 10 preview */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Top 10 Rad etilgan nuqsonlar
                  </p>
                  <div className="space-y-1.5">
                    {preview.top10.map(f => (
                      <div key={f.rank} className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          f.rank <= 3 ? 'bg-red-500' : f.rank <= 6 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}>{f.rank}</span>
                        <span className="flex-1 text-sm text-foreground truncate">
                          {f.faultCode !== '—' ? <span className="font-mono text-orange-400">{f.faultCode}</span> : null}
                          {' '}{f.faultName}
                        </span>
                        <span className="text-sm font-bold text-foreground">{f.totalCount} <span className="text-xs font-normal text-muted-foreground">nuqson</span></span>
                        <span className="text-xs text-orange-400 hidden sm:block">{f.totalVehCnt ?? 0} mashina</span>
                        <span className="text-xs text-muted-foreground hidden sm:block">{f.topShop}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/dashboard/drr">
                  <button className="w-full py-2.5 rounded-xl border border-orange-500 text-orange-400 text-sm font-semibold hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" /> DRR Dashboard da ko&apos;rish
                  </button>
                </Link>
              </div>
            )}

            {/* Warnings */}
            {preview?.warnings && preview.warnings.length > 0 && (
              <div className="bg-card border border-amber-500/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Ogohlantirishlar
                </p>
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: HISTORY ────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground">Import Tarixi</h2>
              <button onClick={loadBatches} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBatches ? 'animate-spin' : ''}`} />
                Yangilash
              </button>
            </div>

            {batches.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Hali import qilinmagan</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Sana', 'Smena', 'Fayl', 'Qatorlar', 'Jami rad etilgan', 'Modellar', 'Yuklagan', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map(b => (
                      <tr key={b.import_batch} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{b.date_from}</td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs font-mono">
                            {shiftLabel(b.shift_from)} → {shiftLabel(b.shift_to)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground max-w-[140px] truncate">{b.file_name}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{b.row_count?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-bold text-foreground">{b.total_count?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{b.models}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{b.imported_by}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard/drr?batch=${b.import_batch}`}>
                              <button className="p-1.5 hover:bg-orange-500/10 rounded-lg transition-colors">
                                <Eye className="w-4 h-4 text-orange-400" />
                              </button>
                            </Link>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(b.import_batch)}
                                disabled={deletingId === b.import_batch}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

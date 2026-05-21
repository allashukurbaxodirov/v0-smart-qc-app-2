'use client'

import { useState, useMemo } from 'react'
import { useQRecords, QRecord, CorrectiveAction } from '@/lib/qrecords-context'
import { useGCA } from '@/lib/gca-context'
import {
  CheckCircle2, Clock, AlertTriangle, Camera, Upload,
  ChevronDown, ChevronUp, Send, X, Wrench, Hash,
  FileText, Filter, Eye,
} from 'lucide-react'

interface EngineerActionPanelProps {
  engineerName:  string
  engineerShop?: string  // filter by shop if provided
  showTypes?:    ('drr' | 'drl' | 'pdi' | 'gca')[]
}

function getRiskStyle(factor: number) {
  if (factor >= 50) return { border: 'border-red-500/40',  bg: 'bg-red-500/10',   text: 'text-red-400',   badge: 'bg-red-500/20 text-red-300 border-red-500/30' }
  if (factor >= 20) return { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
  if (factor >= 10) return { border: 'border-blue-500/40',  bg: 'bg-blue-500/10',  text: 'text-blue-400',  badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
  return { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    drr: 'bg-red-500/20 text-red-300 border-red-500/30',
    drl: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    pdi: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    gca: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase ${colors[type] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
      {type}
    </span>
  )
}

export function EngineerActionPanel({ engineerName, engineerShop, showTypes }: EngineerActionPanelProps) {
  const { records: qRecs, updateCorrectiveAction } = useQRecords()
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'pending' | 'resolved' | 'all'>('pending')
  const [filterShop,   setFilterShop]  = useState(engineerShop ?? '')
  const [saving,       setSaving]      = useState<string | null>(null)
  const [showReportId, setShowReportId] = useState<string | null>(null)

  // Form state per record
  const [forms, setForms] = useState<Record<string, {
    cause: string; action: string; brakePoint: string; photoAfter: string | null
  }>>({})

  const records = useMemo(() => {
    let base = qRecs
    if (showTypes?.length) base = base.filter(r => showTypes.includes(r.type as any))
    if (filterShop)  base = base.filter(r => r.shop === filterShop)
    if (filterStatus !== 'all') base = base.filter(r => filterStatus === 'resolved' ? r.isResolved : !r.isResolved)
    return base.sort((a, b) => b.factor - a.factor || new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [qRecs, showTypes, filterShop, filterStatus])

  const SHOPS = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA']
  const pendingCount = qRecs.filter(r => !r.isResolved && (showTypes ? showTypes.includes(r.type as any) : true)).length

  const getForm = (id: string) => forms[id] ?? { cause: '', action: '', brakePoint: '', photoAfter: null }
  const setForm = (id: string, patch: Partial<typeof forms[string]>) =>
    setForms(p => ({ ...p, [id]: { ...getForm(id), ...patch } }))

  const handlePhotoAfter = (id: string, file: File | null) => {
    if (!file) return
    const r = new FileReader()
    r.onload = e => setForm(id, { photoAfter: e.target?.result as string })
    r.readAsDataURL(file)
  }

  const handleSave = async (record: QRecord) => {
    const f = getForm(record.id)
    if (!f.cause && !f.action) return
    setSaving(record.id)
    const payload: CorrectiveAction = {
      cause:          f.cause,
      action:         f.action,
      brakePoint:     f.brakePoint,
      photoAfter:     f.photoAfter,
      resolvedByName: engineerName,
    }
    await updateCorrectiveAction(record.id, payload)
    setSaving(null)
    setExpandedId(null)
    setShowReportId(record.id)
    setTimeout(() => setShowReportId(null), 4000)
  }

  return (
    <div className="space-y-4">
      {/* Header + Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Chora-Tadbir Paneli</h2>
            <p className="text-xs text-slate-400">Operator kiritgan nuqsonlarni ko'rib chiqing va hal qiling</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-amber-300">{pendingCount} ta kutilmoqda</span>
            </div>
          )}
        </div>
      </div>

      {/* Success notification */}
      {showReportId && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Chora-tadbir muvaffaqiyatli saqlandi!</p>
            <p className="text-xs text-emerald-400/70">Feedback Report sahifasida avtomatik yaratildi</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-xl overflow-hidden border border-slate-700/40">
          {(['pending','resolved','all'] as const).map(v => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={`px-4 py-2 text-xs font-semibold transition-colors ${
                filterStatus === v
                  ? v === 'pending' ? 'bg-amber-600 text-white' : v === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white'
              }`}>
              {v === 'pending' ? '⏳ Kutilmoqda' : v === 'resolved' ? '✅ Hal qilindi' : '📋 Barchasi'}
            </button>
          ))}
        </div>
        {!engineerShop && (
          <select value={filterShop} onChange={e => setFilterShop(e.target.value)}
            className="px-3 py-2 bg-slate-900/60 border border-slate-700/40 rounded-xl text-slate-200 text-xs">
            <option value="">Barcha sehlar</option>
            {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Records list */}
      {records.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {filterStatus === 'pending' ? 'Barcha nuqsonlar hal qilindi ✓' : 'Yozuv yo\'q'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(record => {
            const rsk     = getRiskStyle(record.factor)
            const isOpen  = expandedId === record.id
            const f       = getForm(record.id)
            const isSaving = saving === record.id

            return (
              <div key={record.id} className={`rounded-2xl border ${rsk.border} transition-all ${record.isResolved ? 'opacity-70' : ''}`}
                style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>

                {/* Record header */}
                <div className="flex items-center gap-3 p-4">
                  {/* Factor badge */}
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border ${rsk.badge}`}>
                    <span className="text-xs font-black leading-none">F</span>
                    <span className="text-lg font-black leading-none">{record.factor}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <TypeBadge type={record.type} />
                      <span className="text-sm font-bold text-white">{record.code}</span>
                      <span className="text-sm text-slate-300 truncate">{record.codeName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">{record.shop}</span>
                      {record.sector && <span className="text-cyan-400">{record.sector}</span>}
                      {record.pono && (
                        <span className="flex items-center gap-1 font-mono text-cyan-300">
                          <Hash className="w-3 h-3" />{record.pono}
                        </span>
                      )}
                      <span>{record.date}</span>
                      <span className="font-bold text-white">{record.count} dona</span>
                      {record.createdByName && <span>— {record.createdByName}</span>}
                    </div>
                  </div>

                  {/* Status + toggle */}
                  <div className="flex items-center gap-2">
                    {record.isResolved ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-300">Hal qilindi</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-300">Kutilmoqda</span>
                      </div>
                    )}
                    <button
                      onClick={() => setExpandedId(isOpen ? null : record.id)}
                      className="p-2 hover:bg-slate-700/40 rounded-xl transition-colors">
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {/* Already resolved — show details */}
                {record.isResolved && !isOpen && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1">
                      {record.cause  && <p><span className="font-bold text-emerald-300">Sababi:</span> <span className="text-slate-300">{record.cause}</span></p>}
                      {record.action && <p><span className="font-bold text-emerald-300">Chora:</span> <span className="text-slate-300">{record.action}</span></p>}
                      {record.brakePoint && <p><span className="font-bold text-emerald-300">Brake Point:</span> <span className="text-slate-300 font-mono">{record.brakePoint}</span></p>}
                      {record.resolvedByName && <p className="text-slate-500">— {record.resolvedByName}</p>}
                    </div>
                  </div>
                )}

                {/* Expanded — action form */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-700/40 pt-4">
                    {/* Photos row */}
                    {record.imageUrl && (
                      <div className="mb-4 flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-slate-400 mb-1">Nuqson rasmi (oldin)</p>
                          <img src={record.imageUrl} alt="before"
                            className="w-full h-32 object-cover rounded-xl border border-slate-700/40" />
                        </div>
                        {f.photoAfter && (
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 mb-1">Bartaraf etilgan (keyin)</p>
                            <img src={f.photoAfter} alt="after"
                              className="w-full h-32 object-cover rounded-xl border border-emerald-500/30" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action form */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Sababi *</label>
                        <textarea value={f.cause} onChange={e => setForm(record.id, { cause: e.target.value })}
                          rows={2} placeholder="Bu zo'na M|S da jilvirlangandan keyin..."
                          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm resize-none placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none transition-colors" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chora-tadbir *</label>
                        <textarea value={f.action} onChange={e => setForm(record.id, { action: e.target.value })}
                          rows={2} placeholder="Bu nuqson M|S uchastkasiga yetkazildi..."
                          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm resize-none placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none transition-colors" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Brake Point</label>
                          <input value={f.brakePoint} onChange={e => setForm(record.id, { brakePoint: e.target.value })}
                            placeholder="051234"
                            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm font-mono focus:border-cyan-500/60 focus:outline-none transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Bartaraf rasm</label>
                          <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/60 border border-dashed border-slate-600/60 rounded-xl cursor-pointer hover:border-cyan-500/40 transition-colors">
                            {f.photoAfter
                              ? <span className="text-xs text-emerald-400">✓ Rasm</span>
                              : <><Camera className="w-4 h-4 text-slate-400" /><span className="text-xs text-slate-400">Yuklash</span></>}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => handlePhotoAfter(record.id, e.target.files?.[0] ?? null)} />
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleSave(record)}
                          disabled={(!f.cause && !f.action) || isSaving}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' }}>
                          {isSaving
                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Send className="w-4 h-4" />}
                          {isSaving ? 'Saqlanmoqda...' : 'Hal qilindi — Saqlash'}
                        </button>
                        <button onClick={() => setExpandedId(null)}
                          className="px-4 py-2.5 bg-slate-800/60 text-slate-300 rounded-xl text-sm hover:bg-slate-700/60 transition-colors">
                          Bekor
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

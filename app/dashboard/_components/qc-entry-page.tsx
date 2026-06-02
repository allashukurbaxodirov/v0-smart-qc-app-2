'use client'

import { useState, useMemo, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useQRecords, QRecordType, QShift } from '@/lib/qrecords-context'
import { gcaDefectCodes } from '@/lib/mock-data'
import { SHOP_LINES } from '@/lib/shift-context'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft, Upload, Trash2, Check, Lock,
  Filter, AlertTriangle, Hash, CheckCircle2, Clock, Car,
} from 'lucide-react'
import Link from 'next/link'

// ─── Config ───────────────────────────────────────────────────────────────────
export interface QcEntryConfig {
  type:         QRecordType
  title:        string
  description:  string
  dashHref:     string
  dashLabel:    string
  breadParent:  string
}

type CarModel = 'DAMAS' | 'LABO'

const SHOPS   = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const
const FACTORS = [5, 10, 20, 50] as const
const SHIFTS: QShift[] = ['A', 'B', 'D']

const LOCKED_ROLES = [
  'gca_auditor','d10_inspector','d20_inspector',
  'drr_inspector','drl_inspector','pdi_inspector','incoming_inspector',
  'ga_engineer','welding_engineer',
]

function todayStr() { return new Date().toISOString().split('T')[0] }

function getRiskColor(factor: number) {
  if (factor >= 50) return { bg: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500' }
  if (factor >= 20) return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' }
  if (factor >= 10) return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-500' }
  return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' }
}
function getRiskLabel(factor: number) {
  if (factor >= 50) return 'Kritik'
  if (factor >= 20) return "O'rtacha"
  if (factor >= 10) return 'Past'
  return 'Minimal'
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function QcEntryPage({ cfg }: { cfg: QcEntryConfig }) {
  const { records: all, addRecord, deleteRecord } = useQRecords()
  const records = useMemo(() => all.filter(r => r.type === cfg.type), [all, cfg.type])

  const [carModel, setCarModel] = useState<CarModel | null>(null)
  const [session, setSession] = useState<{ role: string; shift: string | null; shop: string | null; name: string } | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [sortBy,      setSortBy]      = useState<'date' | 'shop' | 'factor'>('date')
  const [filterShop,  setFilterShop]  = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [filterDate,  setFilterDate]  = useState('')
  const [filterResolved, setFilterResolved] = useState<'all' | 'pending' | 'resolved'>('all')

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])

  const isLocked    = session ? LOCKED_ROLES.includes(session.role) : false
  const lockedShift = (isLocked && session?.shift) ? session.shift as QShift : null
  const lockedShop  = (isLocked && session?.shop)  ? session.shop  : null

  // ── Form ──────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    shift:    'A' as QShift,
    date:     todayStr(),
    shop:     'PRESS SHOP',
    sector:   '',
    pono:     '',
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
      pono: form.pono || null,
      code: form.code, codeName: form.codeName,
      factor: Number(form.factor), count: Number(form.count),
      notes: form.notes || null, imageUrl, createdByName: session?.name ?? null,
    })
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
    setForm(p => ({
      ...p, pono: '', sector: '', code: gcaDefectCodes[0].code,
      codeName: gcaDefectCodes[0].name, count: 1, notes: '', image: null,
    }))
  }

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = records
    .filter(r => !filterShop  || r.shop  === filterShop)
    .filter(r => !filterShift || r.shift === filterShift)
    .filter(r => !filterDate  || r.date  === filterDate)
    .filter(r => filterResolved === 'all' ? true : filterResolved === 'resolved' ? r.isResolved : !r.isResolved)
    .sort((a, b) => {
      if (sortBy === 'shop')   return a.shop.localeCompare(b.shop)
      if (sortBy === 'factor') return b.factor - a.factor
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  const shopSectors = SHOP_LINES[form.shop as keyof typeof SHOP_LINES] ?? []

  const pendingCount  = records.filter(r => !r.isResolved).length
  const resolvedCount = records.filter(r => r.isResolved).length

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Industrial header strip */}
      <div style={{ background: 'repeating-linear-gradient(45deg, #f59e0b22, #f59e0b22 10px, transparent 10px, transparent 20px)', borderBottom: '3px solid #f59e0b33' }} className="h-1" />

      <PageHeader
        title={cfg.title}
        description={cfg.description}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: cfg.breadParent, href: cfg.dashHref },
          { label: 'Nuqson kiritish' },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* Back */}
        <Link href={cfg.dashHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {cfg.dashLabel} ga qaytish
        </Link>

        {/* Status chips */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">{pendingCount} ta kutilmoqda</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">{resolvedCount} ta hal qilindi</span>
          </div>
          {showSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/40 bg-emerald-500/20 animate-pulse">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">Muvaffaqiyatli saqlandi</span>
            </div>
          )}
        </div>

        {/* Lock warning */}
        {isLocked && (!lockedShift || !lockedShop) && (
          <div className="border border-amber-500/40 bg-amber-500/10 rounded-xl p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-medium text-amber-300">
              Sizga smena va seh tayinlanmagan. Nuqson kiritish uchun administrator bilan bog&apos;laning.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── FORM ────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-sm p-6 sticky top-20 shadow-2xl">
              {/* Form header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Yangi yozuv</h2>
                  <p className="text-xs text-slate-400">Nuqsonni qayd etish</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* 1. Avtomobil modeli */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-cyan-400" />
                    Avtomobil modeli *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DAMAS', 'LABO'] as CarModel[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCarModel(m)}
                        className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          carModel === m
                            ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-800/60 border-slate-600/60 text-slate-300 hover:border-cyan-500/40'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. PONO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" />
                    PONO raqami
                  </label>
                  <input name="pono" value={form.pono} onChange={handleChange}
                    placeholder="P-2024-001"
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm font-mono placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none transition-colors" />
                </div>

                {/* Shop */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    Nuqson sexi *
                    {isLocked && lockedShop && <Lock className="w-3 h-3 text-slate-500" />}
                  </label>
                  {isLocked && lockedShop ? (
                    <div className="px-3 py-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl text-sm text-cyan-300 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" /> {lockedShop}
                    </div>
                  ) : (
                    <select name="shop" value={form.shop} onChange={handleChange}
                      className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm focus:border-cyan-500/60 focus:outline-none transition-colors">
                      {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                {/* Sector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sektor</label>
                  <select name="sector" value={form.sector} onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm focus:border-cyan-500/60 focus:outline-none transition-colors">
                    <option value="">— Sektorsiz —</option>
                    {shopSectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Defect code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Nuqson kodi *</label>
                  <select name="code" value={form.code} onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm focus:border-cyan-500/60 focus:outline-none transition-colors">
                    {gcaDefectCodes.map(d => (
                      <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Code name auto */}
                {form.codeName && (
                  <div className="px-3 py-2 bg-slate-800/40 border border-slate-700/40 rounded-xl text-xs text-slate-300 font-medium">
                    {form.codeName}
                  </div>
                )}

                {/* Factor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Faktor *</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {FACTORS.map(f => {
                      const clr = getRiskColor(f)
                      const active = Number(form.factor) === f
                      return (
                        <button key={f} type="button" onClick={() => setForm(p => ({ ...p, factor: f }))}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                            active
                              ? `${clr.bg} border-current scale-105 shadow-lg`
                              : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-500'
                          }`}>
                          F-{f}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Soni *</label>
                  <input type="number" name="count" value={form.count} onChange={handleChange} min="1"
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm focus:border-cyan-500/60 focus:outline-none transition-colors" />
                </div>

                {/* Image */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Nuqson rasmi</label>
                  <label className="border-2 border-dashed border-slate-700/60 hover:border-cyan-500/40 rounded-xl p-4 cursor-pointer transition-colors flex flex-col items-center gap-2">
                    {form.image ? (
                      <span className="text-sm text-emerald-400 font-medium">✓ {form.image.name}</span>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-500" />
                        <span className="text-xs text-slate-500 text-center">Rasm yuklang</span>
                      </>
                    )}
                    <input type="file" accept="image/*"
                      onChange={e => setForm(p => ({ ...p, image: e.target.files?.[0] ?? null }))}
                      className="hidden" />
                  </label>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Izoh</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange}
                    placeholder="Qo'shimcha ma'lumot..." rows={2}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-sm resize-none placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none transition-colors" />
                </div>

                <button type="submit"
                  disabled={isLocked && (!lockedShift || !lockedShop)}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 4px 20px #0ea5e930' }}>
                  Saqlash
                </button>
              </form>
            </div>
          </div>

          {/* ── RECORDS ─────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Filters */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Filter className="w-4 h-4 text-slate-500" />
                <select value={filterShop} onChange={e => setFilterShop(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-200 text-sm">
                  <option value="">Barcha sehlar</option>
                  {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterShift} onChange={e => setFilterShift(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-200 text-sm">
                  <option value="">Barcha smenalar</option>
                  {SHIFTS.map(s => <option key={s} value={s}>Smena {s}</option>)}
                </select>
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-200 text-sm" />
                {/* Resolved filter */}
                <div className="flex rounded-lg overflow-hidden border border-slate-700/40">
                  {(['all','pending','resolved'] as const).map(v => (
                    <button key={v} onClick={() => setFilterResolved(v)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        filterResolved === v
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800/60 text-slate-400 hover:text-white'
                      }`}>
                      {v === 'all' ? 'Barchasi' : v === 'pending' ? 'Kutilmoqda' : 'Hal qilindi'}
                    </button>
                  ))}
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/40 rounded-lg text-slate-200 text-sm">
                  <option value="date">Sana</option>
                  <option value="shop">Sexi</option>
                  <option value="factor">Faktor</option>
                </select>
                {(filterShop || filterShift || filterDate) && (
                  <button onClick={() => { setFilterShop(''); setFilterShift(''); setFilterDate('') }}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition-colors">
                    ✕ Tozalash
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'linear-gradient(90deg, #1e293b, #0f172a)' }}>
                      {['Sana','Seh','PONO','Kod','Nuqson','Soni','F','Holat',''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-slate-500 text-sm">
                          Hali ma&apos;lumot yo&apos;q
                        </td>
                      </tr>
                    ) : filtered.map(record => {
                      const rsk = getRiskColor(record.factor)
                      return (
                        <tr key={record.id}
                          className={`border-b border-slate-800/60 transition-colors hover:bg-slate-800/30 ${
                            record.isResolved ? 'opacity-60' : ''
                          }`}>
                          <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">{record.date}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-white">{record.shop}</td>
                          <td className="px-4 py-3 text-xs font-mono text-cyan-300">{record.pono || '—'}</td>
                          <td className="px-4 py-3 text-xs font-bold text-white">{record.code}</td>
                          <td className="px-4 py-3 text-xs text-slate-300 max-w-[150px] truncate">{record.codeName}</td>
                          <td className="px-4 py-3 text-xs font-bold text-white text-center">{record.count}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${rsk.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${rsk.dot}`} />
                              {record.factor}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {record.isResolved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> Hal qilindi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3" /> Kutilmoqda
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteRecord(record.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 flex flex-wrap gap-6">
              <p className="text-sm text-slate-300"><span className="font-bold text-white">Jami:</span> {filtered.length} yozuv</p>
              <p className="text-sm text-slate-300"><span className="font-bold text-white">Soni:</span> {filtered.reduce((s, r) => s + r.count, 0)} dona</p>
              <p className="text-sm text-slate-300"><span className="font-bold text-amber-400">Kutilmoqda:</span> {filtered.filter(r => !r.isResolved).length}</p>
              <p className="text-sm text-slate-300"><span className="font-bold text-emerald-400">Hal qilindi:</span> {filtered.filter(r => r.isResolved).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

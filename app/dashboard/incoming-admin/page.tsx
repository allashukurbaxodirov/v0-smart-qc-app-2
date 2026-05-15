'use client'

import { useState, useMemo, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useIncoming } from '@/lib/incoming-context'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Trash2, Upload, ChevronLeft, Lock } from 'lucide-react'
import Link from 'next/link'

// ─── Nuqson kodlari ────────────────────────────────────────────────────────────
const DEFECT_CODES = [
  { code: 'IC-01', name: "Geometrik o'lcham xatosi"   },
  { code: 'IC-02', name: 'Yuzasi shikastlangan'        },
  { code: 'IC-03', name: 'Material nuqsoni'            },
  { code: 'IC-04', name: 'Korroziya / zanglash'        },
  { code: 'IC-05', name: 'Deformatsiya'                },
  { code: 'IC-06', name: "Teshik o'lchami noto'g'ri"  },
  { code: 'IC-07', name: 'Ranglanish nuqsoni'          },
  { code: 'IC-08', name: 'Yoriq / singan'              },
  { code: 'IC-09', name: 'Yetishmayotgan qism'         },
  { code: 'IC-10', name: "Markirovka xatosi"           },
  { code: 'IC-11', name: "Qalinlik mos emas"           },
  { code: 'IC-12', name: "Yig'ilish xatosi"            },
]

const WAREHOUSES = ['WAREHOUSE-1', 'WAREHOUSE-2', 'SP ZONE'] as const
type Warehouse = typeof WAREHOUSES[number]

type Shift = 'A' | 'B' | 'D'

const today = () => new Date().toISOString().split('T')[0]

const LOCKED_ROLES = ['incoming_inspector']

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function IncomingAdminPage() {
  const { records, addRecord, deleteRecord, loading } = useIncoming()

  const [showSuccess, setShowSuccess] = useState(false)
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [filterShift, setFilterShift] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'defect'>('date')

  // Session — shift locking
  const [session, setSession] = useState<{ role: string; shift: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])
  const isLocked    = session ? LOCKED_ROLES.includes(session.role) : false
  const lockedShift = (isLocked && session?.shift) ? session.shift as Shift : null

  const [form, setForm] = useState({
    partNumber:   '',
    warehouse:    'WAREHOUSE-1' as Warehouse,
    supplier:     '',
    partName:     '',
    totalCount:   '' as string | number,
    defectCount:  '' as string | number,
    defectCode:   'IC-01',
    defectReason: '',
    shift:        'A' as Shift,
    date:         today(),
    image:        null as File | null,
  })

  // Agar smena qulflangan bo'lsa, formani avtomatik yangilash
  useEffect(() => {
    if (lockedShift) setForm(prev => ({ ...prev, shift: lockedShift }))
  }, [lockedShift])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]:
        name === 'totalCount' || name === 'defectCount'
          ? value === '' ? '' : parseInt(value) || 0
          : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.partNumber.trim() || !form.supplier.trim() || !form.partName.trim()) return
    const selected = DEFECT_CODES.find(d => d.code === form.defectCode)
    await addRecord({
      partNumber:     form.partNumber.trim(),
      warehouse:      form.warehouse,
      supplier:       form.supplier.trim(),
      partName:       form.partName.trim(),
      totalCount:     Number(form.totalCount) || 0,
      defectCount:    Number(form.defectCount) || 0,
      defectCode:     Number(form.defectCount) > 0 ? form.defectCode : null,
      defectCodeName: Number(form.defectCount) > 0 ? (selected?.name ?? null) : null,
      defectReason:   form.defectReason.trim() || null,
      shift:          form.shift,
      date:           form.date,
      createdByName:  null,
    })
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
    setForm(prev => ({
      ...prev,
      partNumber: '', supplier: '', partName: '',
      totalCount: '', defectCount: '',
      defectCode: 'IC-01', defectReason: '', image: null,
    }))
  }

  const handleClear = () => {
    setForm({
      partNumber: '', warehouse: 'WAREHOUSE-1', supplier: '',
      partName: '', totalCount: '', defectCount: '',
      defectCode: 'IC-01', defectReason: '', shift: 'A',
      date: today(), image: null,
    })
  }

  // Defect rate badge
  const defectRate = (total: number, defect: number) => {
    if (total === 0) return null
    const pct = (defect / total) * 100
    if (pct === 0)   return { label: '0%', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40' }
    if (pct <= 5)    return { label: `${pct.toFixed(1)}%`, cls: 'bg-amber-500/15 text-amber-600 border-amber-500/40' }
    return { label: `${pct.toFixed(1)}%`, cls: 'bg-rose-500/15 text-rose-600 border-rose-500/40' }
  }

  const filtered = useMemo(() => {
    let list = [...records]
    if (filterWarehouse) list = list.filter(r => r.warehouse === filterWarehouse)
    if (filterShift)     list = list.filter(r => r.shift === filterShift)
    list.sort((a, b) =>
      sortBy === 'date'
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : b.defectCount - a.defectCount
    )
    return list
  }, [records, filterWarehouse, filterShift, sortBy])

  // KPI
  const totalParts   = records.reduce((s, r) => s + r.totalCount,  0)
  const totalDefects = records.reduce((s, r) => s + r.defectCount, 0)
  const overallRate  = totalParts > 0 ? ((totalDefects / totalParts) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Incoming Control — Admin Paneli"
        description="Kiruvchi detallar nazorati va nuqsonlarni qayd etish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Incoming Control' },
        ]}
      />

      <div className="p-5 md:p-6 space-y-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            Orqaga
          </Button>
        </Link>

        {/* ── KPI ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Jami yozuvlar',     value: records.length,  cls: 'text-foreground',  border: 'border-border'          },
            { label: 'Jami kelgan detal', value: totalParts,      cls: 'text-primary',     border: 'border-primary/40'      },
            { label: 'Nuqsonli detal',    value: totalDefects,    cls: 'text-rose-500',    border: 'border-rose-500/40'     },
            { label: 'Nuqson foizi',      value: `${overallRate}%`, cls: totalDefects > 0 ? 'text-amber-500' : 'text-emerald-500', border: totalDefects > 0 ? 'border-amber-500/40' : 'border-emerald-500/40' },
          ].map(k => (
            <div key={k.label} className={`bg-card border-2 ${k.border} rounded-xl p-4`}>
              <p className="text-xs text-muted-foreground mb-1 font-medium">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* ── Muvaffaqiyat xabari ──────────────────────────────────────────── */}
        {showSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-600">Yozuv muvaffaqiyatli saqlandi</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── FORMA ───────────────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
              <h2 className="text-base font-bold text-foreground mb-5">Yangi yozuv qo'shish</h2>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* 1. Detal raqami */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Detal raqami <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="partNumber"
                    value={form.partNumber}
                    onChange={handleChange}
                    placeholder="masalan: 96408506"
                    className="bg-background border-border"
                    required
                  />
                </div>

                {/* 2. Warehouse */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Omborxona <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="warehouse"
                    value={form.warehouse}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {WAREHOUSES.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Yetkazuvchi */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Yetkazuvchi (Supplier) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="supplier"
                    value={form.supplier}
                    onChange={handleChange}
                    placeholder="Yetkazuvchi nomi..."
                    className="bg-background border-border"
                    required
                  />
                </div>

                {/* 4. Detal nomi */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Detal nomi <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="partName"
                    value={form.partName}
                    onChange={handleChange}
                    placeholder="masalan: Передний бампер"
                    className="bg-background border-border"
                    required
                  />
                </div>

                {/* 5. Jami detal soni */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Jami kirib kelgan detal soni <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    name="totalCount"
                    value={form.totalCount}
                    onChange={handleChange}
                    min="1"
                    placeholder="0"
                    className="bg-background border-border"
                    required
                  />
                </div>

                {/* 6. Nuqsonli detal soni */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Nuqsonli detallar soni
                  </label>
                  <Input
                    type="number"
                    name="defectCount"
                    value={form.defectCount}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                    className="bg-background border-border"
                  />
                </div>

                {/* 7. Nuqson kodi — faqat nuqson bo'lsa */}
                {Number(form.defectCount) > 0 && (
                  <div className="space-y-1.5 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                    <label className="text-sm font-semibold text-foreground">
                      Nuqson kodi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="defectCode"
                      value={form.defectCode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {DEFECT_CODES.map(d => (
                        <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                      ))}
                    </select>

                    <label className="text-sm font-semibold text-foreground mt-3 block">
                      Nuqson sababi
                    </label>
                    <textarea
                      name="defectReason"
                      value={form.defectReason}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Qo'shimcha izoh..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {/* 8. Smena */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Smena {isLocked && lockedShift && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </label>
                  {isLocked && lockedShift ? (
                    <div className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />Smena {lockedShift}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {(['A', 'B', 'D'] as Shift[]).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, shift: s }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                            form.shift === s
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 9. Sana */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Sana</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* 10. Rasm */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Rasm (ixtiyoriy)</label>
                  <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Rasm yuklash</span>
                    {form.image && (
                      <span className="text-xs text-primary font-medium">{form.image.name}</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) setForm(prev => ({ ...prev, image: f }))
                      }}
                    />
                  </label>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1">Saqlash</Button>
                  <Button type="button" variant="outline" onClick={handleClear}>Tozalash</Button>
                </div>
              </form>
            </div>
          </div>

          {/* ── JADVAL ──────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Filtrlar */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filterWarehouse}
                onChange={e => setFilterWarehouse(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
              >
                <option value="">Barcha omborlar</option>
                {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
              </select>

              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
              >
                <option value="">Barcha smenalar</option>
                {['A', 'B', 'D'].map(s => <option key={s} value={s}>Smena {s}</option>)}
              </select>

              <div className="flex bg-card border border-border rounded-lg overflow-hidden ml-auto">
                {(['date', 'defect'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => setSortBy(k)}
                    className={`px-3 py-2 text-xs font-medium transition-all ${
                      sortBy === k
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {k === 'date' ? "Sana bo'yicha" : "Nuqson bo'yicha"}
                  </button>
                ))}
              </div>
            </div>

            {/* Jadval */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Smena</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Detal raqami</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Omborxona</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Yetkazuvchi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Detal nomi</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Jami</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-rose-500">Nuqsonli</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Foiz</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson kodi</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          Yuklanmoqda...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          Hali yozuv yo'q
                        </td>
                      </tr>
                    ) : (
                      filtered.map(r => {
                        const rate = defectRate(r.totalCount, r.defectCount)
                        return (
                          <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{r.date}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                {r.shift}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-foreground">{r.partNumber}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                                r.warehouse === 'WAREHOUSE-1' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'   :
                                r.warehouse === 'WAREHOUSE-2' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' :
                                                                'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              }`}>{r.warehouse}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground max-w-[100px] truncate">{r.supplier}</td>
                            <td className="px-4 py-3 text-sm text-foreground max-w-[120px] truncate">{r.partName}</td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{r.totalCount}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-sm font-bold ${r.defectCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {r.defectCount}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {rate ? (
                                <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${rate.cls}`}>
                                  {rate.label}
                                </span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {r.defectCode ? (
                                <div>
                                  <p className="text-xs font-semibold text-foreground">{r.defectCode}</p>
                                  <p className="text-xs text-muted-foreground">{r.defectCodeName}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => deleteRecord(r.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border bg-muted/10 flex flex-wrap gap-4 text-sm">
                <span className="text-muted-foreground">
                  Jami: <strong className="text-foreground">{filtered.length}</strong> ta yozuv
                </span>
                <span className="text-muted-foreground">
                  Kelgan: <strong className="text-primary">{filtered.reduce((s, r) => s + r.totalCount, 0)}</strong> ta detal
                </span>
                <span className="text-muted-foreground">
                  Nuqsonli: <strong className="text-rose-500">{filtered.reduce((s, r) => s + r.defectCount, 0)}</strong> ta
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

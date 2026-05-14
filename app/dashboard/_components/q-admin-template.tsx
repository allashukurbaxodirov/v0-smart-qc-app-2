'use client'

import { useState, useMemo } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useQRecords, QRecordType, QShift } from '@/lib/qrecords-context'
import { gcaDefectCodes } from '@/lib/mock-data'
import { SHOP_LINES } from '@/lib/shift-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Upload, Trash2, Check } from 'lucide-react'
import Link from 'next/link'

// ─── Config ────────────────────────────────────────────────────────────────────
const SHOPS   = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const
const FACTORS = [5, 10, 20, 50] as const
const SHIFTS: QShift[] = ['A', 'B', 'D']

function todayStr() { return new Date().toISOString().split('T')[0] }

function getRisk(factor: number) {
  if (factor >= 50) return { label: 'Yuqori',    color: 'bg-critical text-white' }
  if (factor >= 20) return { label: "O'rtacha",  color: 'bg-warning  text-white' }
  return               { label: 'Past',         color: 'bg-success  text-white' }
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface QAdminProps {
  type: QRecordType
  title: string
  description: string
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function QAdminTemplate({ type, title, description }: QAdminProps) {
  const { records: all, addRecord, deleteRecord } = useQRecords()
  const records = useMemo(() => all.filter(r => r.type === type), [all, type])

  const [showSuccess, setShowSuccess] = useState(false)
  const [sortBy,      setSortBy]      = useState<'date' | 'shop' | 'factor'>('date')
  const [filterShop,  setFilterShop]  = useState('')
  const [filterShift, setFilterShift] = useState('')

  // Form state
  const [formData, setFormData] = useState({
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    if (name === 'shop') {
      // Shop o'zgarganda sektor reset bo'ladi
      setFormData(prev => ({ ...prev, shop: value, sector: '' }))
    } else if (name === 'code') {
      // Kod o'zgarganda nomi avtomatik to'ldiriladi
      const defect = gcaDefectCodes.find(d => d.code === value)
      setFormData(prev => ({ ...prev, code: value, codeName: defect?.name ?? '' }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]:
          name === 'factor' || name === 'count'
            ? value === '' ? '' : parseInt(value) || 0
            : value,
      }))
    }
  }

  // Joriy sehning sektorlari
  const shopSectors = SHOP_LINES[formData.shop as keyof typeof SHOP_LINES] ?? []

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFormData(prev => ({ ...prev, image: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code || !formData.codeName || formData.count < 1) return

    let imageUrl: string | null = null
    if (formData.image) {
      imageUrl = await new Promise(res => {
        const reader = new FileReader()
        reader.onload = ev => res((ev.target?.result as string) ?? null)
        reader.readAsDataURL(formData.image!)
      })
    }

    await addRecord({
      type,
      date:          formData.date,
      shift:         formData.shift,
      shop:          formData.shop,
      sector:        formData.sector || null,
      code:          formData.code,
      codeName:      formData.codeName,
      factor:        Number(formData.factor),
      count:         Number(formData.count),
      notes:         formData.notes || null,
      imageUrl,
      createdByName: null,
    })

    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
    setFormData(prev => ({
      ...prev,
      sector: '',
      code:     gcaDefectCodes[0].code,
      codeName: gcaDefectCodes[0].name,
      count: 1,
      notes: '',
      image: null,
    }))
  }

  const filtered = records
    .filter(r => (!filterShop  || r.shop  === filterShop))
    .filter(r => (!filterShift || r.shift === filterShift))
    .sort((a, b) => {
      if (sortBy === 'shop')   return a.shop.localeCompare(b.shop)
      if (sortBy === 'factor') return b.factor - a.factor
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: title },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* Back */}
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            Orqaga
          </Button>
        </Link>

        {/* Success */}
        {showSuccess && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-success" />
            <p className="text-sm font-medium text-success">
              Ma&apos;lumot muvaffaqiyatli saqlandi
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── FORM ──────────────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
              <h2 className="text-lg font-bold text-foreground mb-6">
                Yangi yozuv qo&apos;shish
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Smena + Sana */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Smena *</label>
                    <select
                      name="shift"
                      value={formData.shift}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    >
                      {SHIFTS.map(s => (
                        <option key={s} value={s}>Smena {s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Sana *</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                </div>

                {/* Shop */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson sexi *</label>
                  <select
                    name="shop"
                    value={formData.shop}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    {SHOPS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Sector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Sektor</label>
                  <select
                    name="sector"
                    value={formData.sector}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">— Sektorsiz —</option>
                    {shopSectors.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                {/* Defect Code — dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson kodi *</label>
                  <select
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    {gcaDefectCodes.map(d => (
                      <option key={d.code} value={d.code}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CodeName — auto-filled, read-only display */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson nomi</label>
                  <div className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-foreground text-sm min-h-[38px]">
                    {formData.codeName || <span className="text-muted-foreground">Kod tanlanganda avtomatik to&apos;ldiriladi</span>}
                  </div>
                </div>

                {/* Factor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Faktor *</label>
                  <select
                    name="factor"
                    value={formData.factor}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    {FACTORS.map(f => (
                      <option key={f} value={f}>
                        {f === 50 ? `${f} — Yuqori xavfli` :
                         f === 20 ? `${f} — O'rtacha` :
                         f === 10 ? `${f} — Past` :
                                    `${f} — Minimal`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Count */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson soni *</label>
                  <Input
                    type="number"
                    name="count"
                    value={formData.count}
                    onChange={handleChange}
                    min="1"
                    className="bg-background border-border"
                  />
                </div>

                {/* Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson rasmi</label>
                  <label className="border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
                    {formData.image ? (
                      <span className="text-sm text-success font-medium">
                        ✓ {formData.image.name}
                      </span>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">
                          Rasm yuklang yoki drag-drop qiling
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Izoh</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Qo'shimcha ma'lumot kiriting..."
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

          {/* ── RECORDS ───────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Filter Controls */}
            <div className="flex gap-3 flex-wrap">
              <select
                value={filterShop}
                onChange={e => setFilterShop(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm"
              >
                <option value="">Barcha sehlar</option>
                {SHOPS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filterShift}
                onChange={e => setFilterShift(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm"
              >
                <option value="">Barcha smenalar</option>
                {SHIFTS.map(s => (
                  <option key={s} value={s}>Smena {s}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm"
              >
                <option value="date">Sana bo&apos;yicha</option>
                <option value="shop">Sexi bo&apos;yicha</option>
                <option value="factor">Faktor bo&apos;yicha</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Smena</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sexi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Kod</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nuqson nomi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Soni</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Faktor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Xavflilik</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sektor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Harakat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          Hali ma&apos;lumot yo&apos;q
                        </td>
                      </tr>
                    ) : (
                      filtered.map(record => {
                        const risk = getRisk(record.factor)
                        return (
                          <tr
                            key={record.id}
                            className="border-b border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-foreground">{record.date}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">
                              {record.shift}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">{record.shop}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">
                              {record.code}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">{record.codeName}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{record.count}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-foreground">
                              {record.factor}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className={risk.color}>{risk.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {record.sector ? (
                                <Badge className="bg-primary/20 text-primary border border-primary/30">
                                  {record.sector}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
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

            {/* Summary */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex flex-wrap gap-6">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Jami yozuvlar:</span>{' '}
                {filtered.length}
              </p>
              <p className="text-sm text-foreground">
                <span className="font-semibold">Jami soni:</span>{' '}
                {filtered.reduce((s, r) => s + r.count, 0)}
              </p>
              <p className="text-sm text-foreground">
                <span className="font-semibold">Og&apos;irlik:</span>{' '}
                {filtered.reduce((s, r) => s + r.count * r.factor, 0)}
              </p>
              <p className="text-sm text-foreground">
                <span className="font-semibold">Kritik (F-50):</span>{' '}
                {filtered.filter(r => r.factor === 50).reduce((s, r) => s + r.count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

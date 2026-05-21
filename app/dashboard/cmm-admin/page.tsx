'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA } from '@/lib/gca-context'
import { gcaDefectCodes, gcaShopOptions, gcaFactorOptions } from '@/lib/mock-data'
import { SHOP_LINES } from '@/lib/shift-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Upload, Trash2, Check, Lock } from 'lucide-react'
import Link from 'next/link'

type ShopType = 'PRESS SHOP' | 'WELDING-1' | 'WELDING-2' | 'PAINT SHOP' | 'GA'
const LOCKED_ROLES = ['cmm_inspector', 'gca_auditor', 'ga_engineer', 'welding_engineer']

export default function CMMAdminPage() {
  const { records, addRecord, deleteRecord } = useGCA()
  const [showSuccess, setShowSuccess] = useState(false)
  const [sortBy, setSortBy]           = useState<'date' | 'shop' | 'factor'>('date')
  const [filterShop, setFilterShop]   = useState<string>('')

  // Session
  const [session, setSession] = useState<{ role: string; shop: string | null; shift: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })
  }, [])
  const isLocked   = session ? LOCKED_ROLES.includes(session.role) : false
  const lockedShop = (isLocked && session?.shop) ? session.shop as ShopType : null

  const [formData, setFormData] = useState({
    shop:   'PRESS SHOP' as ShopType,
    sector: '',
    code:   '63',
    factor: 20,
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
      setFormData(prev => ({ ...prev, shop: value as ShopType, sector: '' }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'factor' || name === 'count' ? (value === '' ? '' : parseInt(value) || 0) : value,
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedDefect = gcaDefectCodes.find(d => d.code === formData.code)
    if (selectedDefect) {
      addRecord({
        shop:     formData.shop,
        sector:   formData.sector || null,
        code:     formData.code,
        codeName: selectedDefect.name,
        factor:   formData.factor,
        count:    formData.count,
        notes:    formData.notes || undefined,
        date:     new Date().toISOString().split('T')[0],
        shift:    session?.shift || 'A',
      })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      setFormData({ shop: lockedShop ?? 'PRESS SHOP', sector: '', code: '63', factor: 20, count: 1, notes: '', image: null })
    }
  }

  const getRiskLevel = (factor: number) => {
    if (factor >= 50) return { label: 'Yuqori',    color: 'bg-critical text-white' }
    if (factor >= 20) return { label: "O'rtacha",  color: 'bg-warning text-white'  }
    return                    { label: 'Past',      color: 'bg-success text-white'  }
  }

  const filteredRecords = records
    .filter(r => !filterShop || r.shop === filterShop)
    .sort((a, b) => {
      if (sortBy === 'date')   return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'shop')   return a.shop.localeCompare(b.shop)
      return b.factor - a.factor
    })

  const shopSectors = SHOP_LINES[formData.shop] ?? []

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="CMM Admin paneli"
        description="CMM nuqsonlarini qayd etish va boshqarish"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'CMM Admin paneli' }]}
      />

      <div className="p-6 space-y-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Orqaga
          </Button>
        </Link>

        {showSuccess && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-success" />
            <p className="text-sm font-medium text-success">Ma&apos;lumot muvaffaqiyatli saqlandi</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
              <h2 className="text-lg font-bold text-foreground mb-6">Yangi CMM yozuv qo&apos;shish</h2>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Shop */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    Sexi * {isLocked && lockedShop && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </label>
                  {isLocked && lockedShop ? (
                    <div className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />{lockedShop}
                    </div>
                  ) : (
                    <select name="shop" value={formData.shop} onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                      {gcaShopOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  )}
                </div>

                {/* Sector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Sektor</label>
                  <select name="sector" value={formData.sector} onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                    <option value="">— Sektorsiz —</option>
                    {shopSectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>

                {/* Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson kodi *</label>
                  <select name="code" value={formData.code} onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                    {gcaDefectCodes.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}
                  </select>
                </div>

                {/* Factor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Faktor *</label>
                  <select name="factor" value={formData.factor} onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                    {gcaFactorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                {/* Count */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson soni *</label>
                  <Input type="number" name="count" value={formData.count} onChange={handleInputChange} min="1" className="bg-background border-border" />
                </div>

                {/* Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson rasmi</label>
                  <label className="border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground text-center">Rasm yuklang yoki drag-drop qiling</span>
                    {formData.image && <span className="text-xs text-primary font-medium">{formData.image.name}</span>}
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) setFormData(p => ({ ...p, image: f })) }} className="hidden" />
                  </label>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Izoh</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange}
                    placeholder="Qo'shimcha malumot..." rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-none" />
                </div>

                <Button type="submit" className="w-full">Saqlash</Button>
              </form>
            </div>
          </div>

          {/* Records */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <select value={filterShop} onChange={e => setFilterShop(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm">
                <option value="">Barcha sehlar</option>
                {gcaShopOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm">
                <option value="date">Sana bo&apos;yicha</option>
                <option value="shop">Sexi bo&apos;yicha</option>
                <option value="factor">Faktor bo&apos;yicha</option>
              </select>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Sana','Sexi','Sektor','Kod','Nuqson nomi','Soni','Faktor','Xavf','Harakat'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Hali ma&apos;lumot yo&apos;q</td></tr>
                    ) : filteredRecords.map(record => {
                      const risk = getRiskLevel(record.factor)
                      return (
                        <tr key={record.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-foreground">{record.date}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{record.shop}</td>
                          <td className="px-4 py-3 text-sm text-foreground">
                            {record.sector
                              ? <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">{record.sector}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-foreground">{record.code}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{record.codeName}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{record.count}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-foreground">{record.factor}</td>
                          <td className="px-4 py-3"><Badge className={risk.color}>{risk.label}</Badge></td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteRecord(record.id)} className="p-2 hover:bg-critical/10 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4 text-critical" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground"><span className="font-semibold">Jami CMM yozuvlar:</span> {filteredRecords.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

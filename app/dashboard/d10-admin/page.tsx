'use client'

import { useState } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA } from '@/lib/gca-context'
import { gcaDefectCodes, gcaShopOptions, gcaFactorOptions } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Upload, Trash2, Check } from 'lucide-react'
import Link from 'next/link'

export default function D10AdminPage() {
  const { records, addRecord, deleteRecord } = useGCA()
  const [showSuccess, setShowSuccess] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'shop' | 'factor'>('date')
  const [filterShop, setFilterShop] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState({
    shop: 'PRESS SHOP',
    code: '63',
    factor: 20,
    count: 1,
    notes: '',
    image: null as File | null,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'factor' || name === 'count' ? parseInt(value) : value,
    }))
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
        shop: formData.shop as any,
        code: formData.code,
        codeName: selectedDefect.name,
        factor: formData.factor,
        count: formData.count,
        notes: formData.notes || undefined,
      })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      setFormData({
        shop: 'PRESS SHOP',
        code: '63',
        factor: 20,
        count: 1,
        notes: '',
        image: null,
      })
    }
  }

  const getRiskLevel = (factor: number) => {
    if (factor >= 22) return { label: 'Yuqori', color: 'bg-critical text-white' }
    if (factor >= 17) return { label: 'O\'rtacha', color: 'bg-warning text-white' }
    return { label: 'Past', color: 'bg-success text-white' }
  }

  const filteredRecords = records
    .filter((r) => !filterShop || r.shop === filterShop)
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'shop') return a.shop.localeCompare(b.shop)
      return b.factor - a.factor
    })

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="GCA Admin paneli"
        description="GCA nuqsonlarini qayd etish va boshqarish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'GCA Admin paneli' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            Orqaga
          </Button>
        </Link>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-success" />
            <p className="text-sm font-medium text-success">Ma&apos;lumot muvaffaqiyatli saqlandi</p>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-20">
              <h2 className="text-lg font-bold text-foreground mb-6">Yangi yozuv qo&apos;shish</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Shop Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson sexi *</label>
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
                </div>

                {/* Defect Code Select */}
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

                {/* Factor Select */}
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

                {/* Count Input */}
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

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nuqson rasmi</label>
                  <label className="border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground text-center">
                      Rasm yuklang yoki drag-drop qiling
                    </span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {/* Notes */}
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

                {/* Submit Button */}
                <Button type="submit" className="w-full">
                  Saqlash
                </Button>
              </form>
            </div>
          </div>

          {/* Records Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Controls */}
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

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sana</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Sexi</th>
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
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          Hali ma'lumot yo'q
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => {
                        const risk = getRiskLevel(record.factor)
                        return (
                          <tr key={record.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground">{record.date}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{record.shop}</td>
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

            {/* Summary */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Jami yozuvlar:</span> {filteredRecords.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

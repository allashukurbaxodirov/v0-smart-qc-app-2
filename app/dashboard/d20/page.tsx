'use client'

import { useState } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { d20DefectsByShop } from '@/lib/mock-data'
import { ChevronLeft, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function D20Page() {
  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'soni' | 'factor'>('factor')
  const [selectedShift, setSelectedShift] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [appliedShift, setAppliedShift] = useState<string>('all')
  const [appliedStartDate, setAppliedStartDate] = useState<string>('')
  const [appliedEndDate, setAppliedEndDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const shops = ['PRESS SHOP', 'WELDING-1', 'WELDING-2'] as const

  const handleApplyFilters = () => {
    setIsLoading(true)
    setTimeout(() => {
      setAppliedShift(selectedShift)
      setAppliedStartDate(startDate)
      setAppliedEndDate(endDate)
      setIsLoading(false)
    }, 300)
  }

  const handleClearFilters = () => {
    setSelectedShift('all')
    setStartDate('')
    setEndDate('')
    setAppliedShift('all')
    setAppliedStartDate('')
    setAppliedEndDate('')
  }

  const getTotalDefects = () => {
    // Simulate filtering logic (in production, this would filter by actual dates/shifts)
    let total = 0
    shops.forEach((shop) => {
      const defects = d20DefectsByShop[shop] || []
      defects.forEach((defect) => {
        // Simple simulation: if shift filter is applied, reduce by 10-20%
        if (appliedShift !== 'all') {
          total += Math.floor(defect.count * 0.85)
        } else {
          total += defect.count
        }
      })
    })
    // If date range is applied, reduce further (simulation)
    if (appliedStartDate || appliedEndDate) {
      total = Math.floor(total * 0.9)
    }
    return total
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-critical text-white'
      case 'medium':
        return 'bg-warning text-white'
      case 'low':
        return 'bg-success text-white'
      default:
        return 'bg-muted text-foreground'
    }
  }

  const getRiskUzbek = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'Yuqori'
      case 'medium':
        return 'O\'rtacha'
      case 'low':
        return 'Past'
      default:
        return ''
    }
  }

  const getShopDefects = (shop: string) => {
    const defects = gcaDefectsByShop[shop as keyof typeof gcaDefectsByShop] || []
    return sortBy === 'factor'
      ? [...defects].sort((a, b) => b.factor - a.factor)
      : [...defects].sort((a, b) => b.count - a.count)
  }

  const getShopTotal = (shop: string) => {
    const defects = gcaDefectsByShop[shop as keyof typeof gcaDefectsByShop] || []
    let total = defects.reduce((sum, d) => sum + d.count, 0)
    // Apply filter reductions
    if (appliedShift !== 'all') {
      total = Math.floor(total * 0.85)
    }
    if (appliedStartDate || appliedEndDate) {
      total = Math.floor(total * 0.9)
    }
    return total
  }

  if (selectedShop) {
    const defects = getShopDefects(selectedShop)

    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title={selectedShop}
          description="GCA nuqsonlari va xavflilik faktorlari"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'GCA', href: '/dashboard/gca' },
            { label: selectedShop },
          ]}
        />

        <div className="p-6 space-y-6">
          {/* Back Button and Sort Controls */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setSelectedShop(null)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Orqaga
            </button>

            <div className="inline-flex bg-card border border-border rounded-lg p-1 gap-1">
              <button
                onClick={() => setSortBy('factor')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  sortBy === 'factor'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Faktor bo'yicha
              </button>
              <button
                onClick={() => setSortBy('soni')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  sortBy === 'soni'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Soni bo'yicha
              </button>
            </div>
          </div>

          {/* Total Defects Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-2">{selectedShop} - Jami nuqsonlar</p>
            <p className="text-4xl font-bold text-foreground">{getShopTotal(selectedShop)}</p>
          </div>

          {/* Defects Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Nuqson kodi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Nuqson nomi</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Soni</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Faktor</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Xavflilik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {defects.map((defect) => (
                  <tr
                    key={defect.code}
                    className={`hover:bg-muted/30 transition-colors ${
                      defect.risk === 'high' ? 'bg-critical/5' : defect.risk === 'medium' ? 'bg-warning/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="font-bold text-foreground">{defect.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">{defect.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-foreground">{defect.count}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-foreground text-lg">{defect.factor}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge className={getRiskColor(defect.risk)}>
                        {getRiskUzbek(defect.risk)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="GCA aniqlangan muammolar"
        description="General Control Analysis - Taqsimot bo'yicha nuqsonlar tahlili"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'GCA' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 md:justify-end md:items-end">
          {/* Shift Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Smena bo'yicha</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Barchasi</option>
              <option value="A">A smena</option>
              <option value="B">B smena</option>
              <option value="D">D smena</option>
            </select>
          </div>

          {/* Start Date Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Boshlanish sanasi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* End Date Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Tugash sanasi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Search Button */}
          <Button
            size="sm"
            onClick={handleApplyFilters}
            disabled={isLoading}
            className="text-sm font-medium"
          >
            {isLoading ? 'Qidirilmoqda...' : 'Qidirish'}
          </Button>

          {/* Clear Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="text-sm"
          >
            Tozalash
          </Button>
        </div>

        {/* Total KPI */}
        <div className="bg-card border border-primary/30 rounded-xl p-8 bg-primary/5">
          <p className="text-sm text-muted-foreground mb-2">D20 aniqlangan muammolar umumiy soni</p>
          <p className="text-5xl font-bold text-foreground">{getTotalDefects()}</p>
          <p className="text-xs text-muted-foreground mt-2">ta nuqson</p>
        </div>

        {/* Shop Distribution */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Taqsimot bo'yicha nuqsonlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {shops.map((shop) => {
              const shopTotal = getShopTotal(shop)

              return (
                <button
                  key={shop}
                  onClick={() => setSelectedShop(shop)}
                  className="p-5 bg-card border-2 border-border rounded-xl hover:border-primary transition-all hover:shadow-lg text-left"
                >
                  <h3 className="font-bold text-foreground mb-3">{shop}</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Jami nuqsonlar</p>
                      <p className="text-3xl font-bold text-foreground">{shopTotal}</p>
                    </div>
                    <div className="flex items-center gap-1 text-success text-xs font-semibold">
                      <TrendingDown className="w-4 h-4" />
                      <span>Ko'rib chiqish</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { ChevronLeft, TrendingDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDefects } from '@/lib/supabase/hooks'
import { mapSupabaseDefectToUI, getRiskColorClass, getRiskLabelUzbek } from '@/lib/supabase/mappers'
import { GCADefect } from '@/lib/supabase/queries'

export default function GCAPage() {
  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'soni' | 'factor'>('factor')
  const [selectedShift, setSelectedShift] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [appliedShift, setAppliedShift] = useState<string>('all')
  const [appliedStartDate, setAppliedStartDate] = useState<string>('')
  const [appliedEndDate, setAppliedEndDate] = useState<string>('')

  const shops = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const

  // Fetch defects from Supabase with applied filters
  const { defects, isLoading, error } = useDefects({
    shop: selectedShop || undefined,
    shift: appliedShift !== 'all' ? appliedShift : undefined,
    startDate: appliedStartDate || undefined,
    endDate: appliedEndDate || undefined,
  })

  const handleApplyFilters = () => {
    setAppliedShift(selectedShift)
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
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
    return defects.reduce((sum, d) => sum + d.quantity, 0)
  }

  const getShopDefects = (shop: string) => {
    const shopDefects = defects.filter((d) => d.shop === shop)
    const mapped = shopDefects.map(mapSupabaseDefectToUI)
    return sortBy === 'factor'
      ? [...mapped].sort((a, b) => b.factor - a.factor)
      : [...mapped].sort((a, b) => b.count - a.count)
  }

  const getShopTotal = (shop: string) => {
    return defects
      .filter((d) => d.shop === shop)
      .reduce((sum, d) => sum + d.quantity, 0)
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
                {defects.map((defect) => {
                  const mapped = mapSupabaseDefectToUI(defect)
                  return (
                    <tr
                      key={defect.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        mapped.risk === 'high' ? 'bg-critical/5' : mapped.risk === 'medium' ? 'bg-warning/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-bold text-foreground">{mapped.code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground">{mapped.name}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-foreground">{mapped.count}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-foreground text-lg">{mapped.factor}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge className={getRiskColorClass(mapped.risk)}>
                          {getRiskLabelUzbek(mapped.risk)}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
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
            className="text-sm font-medium"
          >
            Qidirish
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
          <p className="text-sm text-muted-foreground mb-2">GCA aniqlangan muammolar umumiy soni</p>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Yuklanmoqda...</p>
            </div>
          ) : (
            <>
              <p className="text-5xl font-bold text-foreground">{getTotalDefects()}</p>
              <p className="text-xs text-muted-foreground mt-2">ta nuqson</p>
            </>
          )}
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

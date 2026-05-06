'use client'

import { useState, useMemo } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { pdiDefectsByShop, pdiShopOptions, pdiFactorOptions } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ChevronDown,
  ChevronRight,
  Search,
  CalendarIcon,
  Factory,
  AlertTriangle,
  TrendingUp,
  Filter,
  ArrowUpDown,
} from 'lucide-react'
import { format } from 'date-fns'

type ShopName = keyof typeof pdiDefectsByShop

interface DefectItem {
  code: string
  name: string
  count: number
  factor: number
}

export default function PDIPage() {
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set(['PRESS SHOP']))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShop, setSelectedShop] = useState<string>('all')
  const [selectedFactor, setSelectedFactor] = useState<string>('all')
  const [selectedSmena, setSelectedSmena] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [sortConfig, setSortConfig] = useState<{ key: 'count' | 'factor'; direction: 'asc' | 'desc' } | null>(null)

  const toggleShop = (shop: string) => {
    const newExpanded = new Set(expandedShops)
    if (newExpanded.has(shop)) {
      newExpanded.delete(shop)
    } else {
      newExpanded.add(shop)
    }
    setExpandedShops(newExpanded)
  }

  const getFactorColor = (factor: number) => {
    switch (factor) {
      case 5:
        return 'bg-blue-500/20 text-blue-600 border-blue-500/30'
      case 10:
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
      case 20:
        return 'bg-orange-500/20 text-orange-600 border-orange-500/30'
      case 50:
        return 'bg-red-500/20 text-red-600 border-red-500/30'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getFactorBgColor = (factor: number) => {
    switch (factor) {
      case 5:
        return 'bg-blue-500'
      case 10:
        return 'bg-yellow-500'
      case 20:
        return 'bg-orange-500'
      case 50:
        return 'bg-red-500'
      default:
        return 'bg-muted'
    }
  }

  // Filter and process data
  const filteredData = useMemo(() => {
    const shops = selectedShop === 'all' 
      ? Object.keys(pdiDefectsByShop) as ShopName[]
      : [selectedShop as ShopName]

    const result: Record<string, DefectItem[]> = {}

    shops.forEach((shop) => {
      let defects = [...(pdiDefectsByShop[shop] || [])]

      // Filter by factor
      if (selectedFactor !== 'all') {
        defects = defects.filter((d) => d.factor === parseInt(selectedFactor))
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        defects = defects.filter(
          (d) =>
            d.name.toLowerCase().includes(query) ||
            d.code.toLowerCase().includes(query)
        )
      }

      // Sort
      if (sortConfig) {
        defects.sort((a, b) => {
          if (sortConfig.direction === 'asc') {
            return a[sortConfig.key] - b[sortConfig.key]
          }
          return b[sortConfig.key] - a[sortConfig.key]
        })
      }

      if (defects.length > 0) {
        result[shop] = defects
      }
    })

    return result
  }, [selectedShop, selectedFactor, searchQuery, sortConfig])

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const allDefects: (DefectItem & { shop: string })[] = []
    
    Object.entries(filteredData).forEach(([shop, defects]) => {
      defects.forEach((d) => allDefects.push({ ...d, shop }))
    })

    const totalDefects = allDefects.reduce((sum, d) => sum + d.count, 0)
    
    const mostCommonDefect = allDefects.length > 0
      ? allDefects.reduce((max, d) => (d.count > max.count ? d : max), allDefects[0])
      : null
    
    const highestFactorDefect = allDefects.length > 0
      ? allDefects.reduce((max, d) => (d.factor > max.factor ? d : max), allDefects[0])
      : null

    const shopDefectCounts: Record<string, number> = {}
    allDefects.forEach((d) => {
      shopDefectCounts[d.shop] = (shopDefectCounts[d.shop] || 0) + d.count
    })
    const mostProblematicShop = Object.entries(shopDefectCounts).length > 0
      ? Object.entries(shopDefectCounts).reduce((max, [shop, count]) => 
          count > max.count ? { shop, count } : max, { shop: '', count: 0 })
      : null

    return {
      totalDefects,
      mostCommonDefect,
      highestFactorDefect,
      mostProblematicShop,
    }
  }, [filteredData])

  const handleSort = (key: 'count' | 'factor') => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'desc' }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="PDI"
        description="Pre-Delivery Inspection - Sexlar bo'yicha nuqsonlar tahlili"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'PDI' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Filterlar</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'dd.MM.yyyy') : 'Sana tanlang'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Smena Filter */}
            <Select value={selectedSmena} onValueChange={setSelectedSmena}>
              <SelectTrigger>
                <SelectValue placeholder="Smena" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha smenalar</SelectItem>
                <SelectItem value="A">A smena</SelectItem>
                <SelectItem value="B">B smena</SelectItem>
                <SelectItem value="D">D smena</SelectItem>
              </SelectContent>
            </Select>

            {/* Shop Filter */}
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger>
                <SelectValue placeholder="Sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha sexlar</SelectItem>
                {pdiShopOptions.map((shop) => (
                  <SelectItem key={shop.value} value={shop.value}>
                    {shop.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Factor Filter */}
            <Select value={selectedFactor} onValueChange={setSelectedFactor}>
              <SelectTrigger>
                <SelectValue placeholder="Faktor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha faktorlar</SelectItem>
                {pdiFactorOptions.map((factor) => (
                  <SelectItem key={factor.value} value={factor.value.toString()}>
                    Faktor {factor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nuqson qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Jami nuqsonlar</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{summaryStats.totalDefects} ta</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <p className="text-sm text-muted-foreground">Eng ko&apos;p uchraydigan</p>
            </div>
            <p className="text-xl font-bold text-foreground truncate">
              {summaryStats.mostCommonDefect?.name || '-'}
            </p>
            <p className="text-sm text-muted-foreground">
              {summaryStats.mostCommonDefect?.count || 0} ta
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-critical/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-critical" />
              </div>
              <p className="text-sm text-muted-foreground">Eng yuqori faktorli</p>
            </div>
            <p className="text-xl font-bold text-foreground truncate">
              {summaryStats.highestFactorDefect?.name || '-'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getFactorColor(summaryStats.highestFactorDefect?.factor || 0)}>
                Faktor {summaryStats.highestFactorDefect?.factor || 0}
              </Badge>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Factory className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">Eng muammoli sex</p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {summaryStats.mostProblematicShop?.shop || '-'}
            </p>
            <p className="text-sm text-muted-foreground">
              {summaryStats.mostProblematicShop?.count || 0} ta nuqson
            </p>
          </div>
        </div>

        {/* Factor Legend */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-3">Faktor ko&apos;rsatkichlari</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm text-muted-foreground">5 - Past xavf</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span className="text-sm text-muted-foreground">10 - O&apos;rtacha xavf</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span className="text-sm text-muted-foreground">20 - Yuqori xavf</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span className="text-sm text-muted-foreground">50 - Juda yuqori xavf</span>
            </div>
          </div>
        </div>

        {/* Shop Tables */}
        <div className="space-y-4">
          {Object.entries(filteredData).map(([shop, defects]) => (
            <div
              key={shop}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Shop Header */}
              <button
                onClick={() => toggleShop(shop)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedShops.has(shop) ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <Factory className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">{shop}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {defects.length} ta nuqson turi
                  </Badge>
                  <Badge variant="secondary">
                    {defects.reduce((sum, d) => sum + d.count, 0)} ta jami
                  </Badge>
                </div>
              </button>

              {/* Defects Table */}
              {expandedShops.has(shop) && (
                <div className="border-t border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                            Nuqson nomi
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                            Nuqson kodi
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                            <button
                              onClick={() => handleSort('count')}
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Soni
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                            <button
                              onClick={() => handleSort('factor')}
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Faktor
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {defects.map((defect, index) => (
                          <tr
                            key={defect.code}
                            className={`border-b border-border hover:bg-muted/30 transition-colors ${
                              index % 2 === 0 ? '' : 'bg-muted/10'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <span className="font-medium text-foreground">
                                {defect.name}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="font-mono">
                                {defect.code}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-semibold text-foreground">
                                {defect.count} ta
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Badge className={`${getFactorColor(defect.factor)} border`}>
                                {defect.factor}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {Object.keys(filteredData).length === 0 && (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nuqsonlar topilmadi
              </h3>
              <p className="text-muted-foreground">
                Tanlangan filterlar bo&apos;yicha hech qanday nuqson topilmadi. Filterlarni o&apos;zgartiring.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

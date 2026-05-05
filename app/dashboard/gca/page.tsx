'use client'

import { useState } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { ChevronLeft, CheckCircle2, XCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'

// GCA Daily Board Data - simulated real factory data
const generateDailyData = (shopFactor: number) => {
  const dates = ['29-apr', '30-apr', '01-may', '02-may', '03-may', '04-may', '05-may']
  return dates.map((date, index) => {
    const target = shopFactor
    const variance = Math.random() * 0.4 - 0.2 // -20% to +20%
    const actual = Math.round(target * (1 + variance) * 10) / 10
    return {
      date,
      actual,
      target,
      status: actual <= target ? 'good' : 'bad',
    }
  })
}

const generateF10Data = (baseFactor: number) => {
  const dates = ['29-apr', '30-apr', '01-may', '02-may', '03-may', '04-may', '05-may']
  return dates.map((date) => {
    const target = baseFactor * 0.8
    const variance = Math.random() * 0.5 - 0.25
    const actual = Math.round(target * (1 + variance) * 10) / 10
    return {
      date,
      actual,
      target,
      status: actual <= target ? 'good' : 'bad',
    }
  })
}

const shopSections = [
  { id: 'press', name: 'PRESS SHOP', factor: 5 },
  { id: 'welding', name: 'WELDING', factor: 10 },
  { id: 'paint', name: 'PAINT SHOP', factor: 20 },
  { id: 'ga', name: 'GA SHOP', factor: 10 },
  { id: 'sqe', name: 'SQE', factor: 5 },
  { id: 'qe', name: 'QE', factor: 5 },
]

export default function GCAPage() {
  const [selectedShift, setSelectedShift] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')

  const getOverallStatus = (data: { status: string }[]) => {
    const badCount = data.filter((d) => d.status === 'bad').length
    return badCount <= 2 ? 'good' : 'bad'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="GCA DAILY BOARD"
        description="General Control Analysis - Kunlik natijalar taxtasi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'GCA batafsil ko\'rinish' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 md:justify-between md:items-end">
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard" className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Orqaga
            </a>
          </Button>

          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Sana bo&apos;yicha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Shift Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Smena bo&apos;yicha</label>
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
          </div>
        </div>

        {/* Shop Sections Grid - Like Physical Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {shopSections.map((shop) => {
            const dailyData = generateDailyData(shop.factor)
            const f10Data = generateF10Data(shop.factor)
            const dailyStatus = getOverallStatus(dailyData)
            const f10Status = getOverallStatus(f10Data)
            const overallGood = dailyStatus === 'good' && f10Status === 'good'

            return (
              <div
                key={shop.id}
                className="bg-card border-2 border-border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                {/* Section Header - Like printed board title */}
                <div className="bg-primary px-4 py-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-primary-foreground">{shop.name}</h3>
                  <span className="text-xs text-primary-foreground/80">Factor: {shop.factor}</span>
                </div>

                {/* Charts Container */}
                <div className="p-4 space-y-4 bg-white">
                  {/* Daily GCA Result Chart */}
                  <div className="border border-border rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Daily GCA Result</h4>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="var(--color-muted-foreground)" />
                          <YAxis tick={{ fontSize: 9 }} stroke="var(--color-muted-foreground)" label={{ value: 'WDPV', angle: -90, position: 'insideLeft', fontSize: 9 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="actual" fill="var(--color-success)" name="Actual" />
                          <Line type="monotone" dataKey="target" stroke="var(--color-critical)" strokeWidth={2} name="Target" dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Data Table */}
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-1 px-1 text-left text-muted-foreground">Sana</th>
                            {dailyData.map((d) => (
                              <th key={d.date} className="py-1 px-1 text-center text-muted-foreground">{d.date}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="py-1 px-1 text-muted-foreground">Actual</td>
                            {dailyData.map((d) => (
                              <td key={d.date} className={`py-1 px-1 text-center font-medium ${d.status === 'good' ? 'text-success' : 'text-critical'}`}>
                                {d.actual}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-1 px-1 text-muted-foreground">Target</td>
                            {dailyData.map((d) => (
                              <td key={d.date} className="py-1 px-1 text-center text-foreground">{d.target}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* GCA F10 Result Chart */}
                  <div className="border border-border rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-foreground mb-2">GCA F10 Result</h4>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={f10Data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="var(--color-muted-foreground)" />
                          <YAxis tick={{ fontSize: 9 }} stroke="var(--color-muted-foreground)" label={{ value: 'WDPV', angle: -90, position: 'insideLeft', fontSize: 9 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="actual" fill="var(--color-chart-2)" name="Actual" />
                          <Line type="monotone" dataKey="target" stroke="var(--color-critical)" strokeWidth={2} name="Target" dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Data Table */}
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-1 px-1 text-left text-muted-foreground">Sana</th>
                            {f10Data.map((d) => (
                              <th key={d.date} className="py-1 px-1 text-center text-muted-foreground">{d.date}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="py-1 px-1 text-muted-foreground">Actual</td>
                            {f10Data.map((d) => (
                              <td key={d.date} className={`py-1 px-1 text-center font-medium ${d.status === 'good' ? 'text-success' : 'text-critical'}`}>
                                {d.actual}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-1 px-1 text-muted-foreground">Target</td>
                            {f10Data.map((d) => (
                              <td key={d.date} className="py-1 px-1 text-center text-foreground">{d.target}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Status Indicator Footer - Like real board status */}
                <div className={`px-4 py-3 flex items-center justify-between ${overallGood ? 'bg-success/10' : 'bg-critical/10'}`}>
                  <span className="text-sm font-medium text-foreground">Holat:</span>
                  <div className="flex items-center gap-2">
                    {overallGood ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <span className="text-sm font-bold text-success">Yaxshi</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-critical" />
                        <span className="text-sm font-bold text-critical">Yomon</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Izohlar</h4>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-success rounded"></div>
              <span className="text-sm text-muted-foreground">Actual (Haqiqiy qiymat)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-critical rounded"></div>
              <span className="text-sm text-muted-foreground">Target (Maqsad)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Yaxshi natija</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-critical" />
              <span className="text-sm text-muted-foreground">Yomon natija</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Factor qiymatlari:</strong> 5, 10, 20, 50 - har bir sex uchun belgilangan standart faktor qiymatlari
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import PageHeader from '@/components/dashboard/page-header'
import { monthlyTrendData, workshopPerformance } from '@/lib/mock-data'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react'

export default function MainDashboard() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'border-success bg-success/5'
      case 'warning':
        return 'border-warning bg-warning/5'
      case 'critical':
        return 'border-critical bg-critical/5'
      default:
        return 'border-border bg-muted/30'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-success text-white'
      case 'warning':
        return 'bg-warning text-white'
      case 'critical':
        return 'bg-critical text-white'
      default:
        return 'bg-muted text-foreground'
    }
  }

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="Umumiy dashboard"
        description="Ishlab chiqarish ko'rsatkichlarining o'ylanish tahlili va trend"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Umumiy ko\'rish' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Monthly Trends */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Oylik trendlar</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="gca" 
                stroke="var(--color-chart-1)" 
                name="GCA (%)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="ftq" 
                stroke="var(--color-chart-2)" 
                name="FTQ (%)"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="drr" 
                stroke="var(--color-chart-3)" 
                name="DRR (%)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Workshop Performance Comparison Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Sexlar samaradorligi (GCA, FTQ, DRR)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workshopPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <Legend />
              <Bar dataKey="gca" fill="var(--color-chart-1)" name="GCA (%)" />
              <Bar dataKey="ftq" fill="var(--color-chart-2)" name="FTQ (%)" />
              <Bar dataKey="drr" fill="var(--color-chart-3)" name="DRR (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Executive-Level Workshop Rankings Grid */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-bold text-foreground">Sexlar reytingi</h2>
            <p className="text-sm text-muted-foreground">Jami nuqsonlar va asosiy KPI ko'rsatkichlari</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {workshopPerformance.map((workshop) => (
              <div
                key={workshop.name}
                className={`relative bg-card border-2 rounded-xl p-5 transition-all hover:shadow-lg hover:border-primary ${getStatusColor(
                  workshop.status as string
                )}`}
              >
                {/* Rank Badge - Top Right */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <span className="text-2xl">{getMedalIcon(workshop.rank)}</span>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    {workshop.rank}
                  </span>
                </div>

                {/* Workshop Name */}
                <div className="mb-4 pr-12">
                  <h3 className="text-lg font-bold text-foreground truncate">{workshop.name}</h3>
                </div>

                {/* Main Metric - Defects */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Jami nuqsonlar</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">{workshop.defects}</p>
                    <p className="text-xs text-muted-foreground">ta</p>
                  </div>
                </div>

                {/* KPI - DRR */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">GCA</p>
                    <p className="text-xl font-bold text-foreground">{workshop.gca}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">DRR</p>
                    <p className="text-xl font-bold text-success">{workshop.drr}%</p>
                  </div>
                </div>

                {/* Status Badge and Trend */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                      workshop.status as string
                    )}`}
                  >
                    {workshop.status === 'good'
                      ? '✓ Yaxshi'
                      : workshop.status === 'warning'
                        ? '⚠ Diqqat'
                        : '✕ Muammo'}
                  </span>

                  {workshop.trend === 'up' ? (
                    <div className="flex items-center gap-0.5 text-critical text-xs font-semibold">
                      <TrendingUp className="w-4 h-4" />
                      <span>Oshdi</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 text-success text-xs font-semibold">
                      <TrendingDown className="w-4 h-4" />
                      <span>Tushdi</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-success/30 rounded-lg p-4 bg-success/5">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-success" />
              <p className="text-sm font-semibold text-muted-foreground">Eng yaxshi sex</p>
            </div>
            <p className="text-lg font-bold text-foreground">{workshopPerformance[0].name}</p>
            <p className="text-xs text-muted-foreground mt-1">{workshopPerformance[0].defects} nuqson</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm font-semibold text-muted-foreground mb-2">O'rtacha GCA</p>
            <p className="text-lg font-bold text-foreground">
              {(workshopPerformance.reduce((sum, w) => sum + w.gca, 0) / workshopPerformance.length).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Barcha sexlar</p>
          </div>

          <div className="bg-card border border-critical/30 rounded-lg p-4 bg-critical/5">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-critical" />
              <p className="text-sm font-semibold text-muted-foreground">Eng ko'p nuqson</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {workshopPerformance.reduce((max, w) => (w.defects > max.defects ? w : max)).name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {workshopPerformance.reduce((max, w) => (w.defects > max.defects ? w : max)).defects} nuqson
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import PageHeader from '@/components/dashboard/page-header'
import { kpiData } from '@/lib/mock-data'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const ftqTrendData = [
  { date: '1-kun', value: 86.5 },
  { date: '2-kun', value: 86.8 },
  { date: '3-kun', value: 87.2 },
  { date: '4-kun', value: 87.5 },
  { date: '5-kun', value: 87.9 },
  { date: '6-kun', value: 88.2 },
  { date: '7-kun', value: 88.1 },
  { date: '8-kun', value: 88.3 },
  { date: '9-kun', value: 88.4 },
  { date: '10-kun', value: 88.4 },
]

export default function FTQPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="FTQ - Birinchi Marta Sifat"
        description="Birinchi urinishda defektsiz ishlab chiqariladigan avtomobillar foizi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar', href: '/dashboard/kpi' },
          { label: 'FTQ' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Joriy qiymat</p>
            <p className="text-3xl font-bold text-warning">{kpiData.ftq.current}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Maqsad</p>
            <p className="text-3xl font-bold text-primary">{kpiData.ftq.target}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'tgan qiymat</p>
            <p className="text-3xl font-bold text-muted-foreground">{kpiData.ftq.previous}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'zgarish</p>
            <p className="text-3xl font-bold text-success">+1.9%</p>
            <p className="text-xs text-muted-foreground mt-1">o'tgan kundan</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">FTQ Trend (Oxirgi 10 kun)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={ftqTrendData}>
              <defs>
                <linearGradient id="ftqGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" domain={[85, 90]} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="var(--color-warning)" 
                fillOpacity={1}
                fill="url(#ftqGradient)"
                name="FTQ (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Diqqat</h2>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <p className="text-sm text-warning font-semibold mb-2">⚠️ Maqsaddan pastda</p>
            <p className="text-sm text-foreground">
              FTQ ko'rsatkichi hali ham maqsad qiymatining (92.0%) ostida joylashgan. Ishlab chiqarish jarayonida defektlar oldini olish bo'yicha ko'shimcha choralarni qabul qilish zarur.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import PageHeader from '@/components/dashboard/page-header'
import { kpiData } from '@/lib/mock-data'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const d10TrendData = [
  { date: '1-kun', value: 178 },
  { date: '2-kun', value: 172 },
  { date: '3-kun', value: 168 },
  { date: '4-kun', value: 164 },
  { date: '5-kun', value: 160 },
  { date: '6-kun', value: 158 },
  { date: '7-kun', value: 157 },
  { date: '8-kun', value: 156 },
  { date: '9-kun', value: 156 },
  { date: '10-kun', value: 156 },
]

export default function D10Page() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="D10 - Dastlab 10 ta Defekt"
        description="Ishlab chiqarish boshlang'ichida eng ko'p tarqalgan defektlar"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar', href: '/dashboard/kpi' },
          { label: 'D10' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Joriy qiymat</p>
            <p className="text-3xl font-bold text-critical">{kpiData.d10.current}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Maqsad</p>
            <p className="text-3xl font-bold text-primary">{kpiData.d10.target}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'tgan qiymat</p>
            <p className="text-3xl font-bold text-muted-foreground">{kpiData.d10.previous}</p>
            <p className="text-xs text-muted-foreground mt-1">ta defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'zgarish</p>
            <p className="text-3xl font-bold text-success">-22</p>
            <p className="text-xs text-muted-foreground mt-1">kamaydi</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">D10 Trend (Oxirgi 10 kun)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={d10TrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <Bar 
                dataKey="value" 
                fill="var(--color-critical)" 
                name="Defektlar"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-success/10 border border-success/30 rounded-lg p-4">
          <p className="text-sm text-success font-semibold mb-2">✓ Ijobiy trend</p>
          <p className="text-sm text-foreground">
            D10 defektlari oxirgi 10 kunning ichida 22 ta kamaydi (12.4% yaxshilandi). Agar bu trend davom etsa, maqsadga erishimiz mumkin.
          </p>
        </div>
      </div>
    </div>
  )
}

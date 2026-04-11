'use client'

import PageHeader from '@/components/dashboard/page-header'
import { kpiData } from '@/lib/mock-data'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

const gcaTrendData = [
  { date: '1-kun', value: 95.2 },
  { date: '2-kun', value: 95.4 },
  { date: '3-kun', value: 95.8 },
  { date: '4-kun', value: 96.1 },
  { date: '5-kun', value: 96.3 },
  { date: '6-kun', value: 96.5 },
  { date: '7-kun', value: 96.4 },
  { date: '8-kun', value: 96.6 },
  { date: '9-kun', value: 96.5 },
  { date: '10-kun', value: 96.5 },
]

export default function GCAPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="GCA - Umumiy Konstruksiya Sifati"
        description="Avtomobil konstruksiyasining umumiy sifat ko'rsatkichlarining batafsil tahlili"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KPI Ko\'rsatkichlar', href: '/dashboard/kpi' },
          { label: 'GCA' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Joriy qiymat</p>
            <p className="text-3xl font-bold text-success">{kpiData.gca.current}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Maqsad</p>
            <p className="text-3xl font-bold text-primary">{kpiData.gca.target}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'tgan qiymat</p>
            <p className="text-3xl font-bold text-muted-foreground">{kpiData.gca.previous}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs uppercase text-muted-foreground tracking-wider mb-2">O'zgarish</p>
            <p className="text-3xl font-bold text-success">+1.3%</p>
            <p className="text-xs text-muted-foreground mt-1">o'tgan kundan</p>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">GCA Trend (Oxirgi 10 kun)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={gcaTrendData}>
              <defs>
                <linearGradient id="gcaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
              <YAxis 
                stroke="var(--color-muted-foreground)" 
                domain={[94, 97]}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="var(--color-success)" 
                fillOpacity={1}
                fill="url(#gcaGradient)"
                name="GCA (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Target Progress */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Maqsadga nisbatan progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Joriy qiymat</span>
                <span className="text-sm font-bold text-success">96.5%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-success h-3 rounded-full" 
                  style={{ width: '96.5%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Maqsad qiymat</span>
                <span className="text-sm font-bold text-primary">98.0%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-primary h-3 rounded-full" 
                  style={{ width: '98.0%' }}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Maqsadga erishishimiz kerak: <span className="font-semibold text-primary">+1.5%</span>
          </p>
        </div>

        {/* Analysis */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tahlil</h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              GCA ko'rsatkichi oxirgi 10 kunning ichida 1.3% ga yuksalgan. Bu musbat trend ishlab chiqarish jarayonining yaxshilanishini ko'rsatadi.
            </p>
            <p>
              Ammo hali ham maqsad qiymatiga (98.0%) 1.5% uzoqda. Agar bu trend davom etsa, maqsadga bir necha kun ichida erishamiz.
            </p>
            <p>
              Ushbu muvaffaqiyatning asosiy sabablari:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Bojqalar bo'limdagi sifat ta'siri yaxshilandi</li>
              <li>Elektr tizimi defektlari 15% kamaydi</li>
              <li>Ishchi shunchaki treningi yaxshi natija berdi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

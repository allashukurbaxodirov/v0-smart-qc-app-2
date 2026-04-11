'use client'

import PageHeader from '@/components/dashboard/page-header'
import { dailyProduction } from '@/lib/mock-data'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="Analitika"
        description="Ishlab chiqarish jarayonining chuqur tahlili va statistikasi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analitika' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Production Overview */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Kunlik ishlab chiqarish</h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={dailyProduction}>
              <defs>
                <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="produced" 
                stroke="var(--color-success)" 
                fillOpacity={1}
                fill="url(#colorProduced)"
                name="Ishlab chiqarildi"
              />
              <Area 
                type="monotone" 
                dataKey="target" 
                stroke="var(--color-primary)" 
                fillOpacity={1}
                fill="url(#colorTarget)"
                name="Maqsad"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Defect Trend */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Defekt sonining o'zgarishi</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyProduction}>
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
                dataKey="defects" 
                fill="var(--color-critical)" 
                name="Defektlar"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Production Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">O'rtacha kunlik ishlab chiqarish</p>
            <p className="text-3xl font-bold text-foreground">424 ta</p>
            <p className="text-xs text-success mt-2">+0.5% maqsaddan ortiq</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">O'rtacha defektlar (bir)</p>
            <p className="text-3xl font-bold text-critical">22.4 ta</p>
            <p className="text-xs text-success mt-2">-2.1% ko'p aralash</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">O'rtacha defekt darajasi</p>
            <p className="text-3xl font-bold text-warning">5.3%</p>
            <p className="text-xs text-warning mt-2">-0.4% o'tgan oyiga nisbatan</p>
          </div>
        </div>

        {/* Production Data Table */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Kunlik ma'lumotlar</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Kun</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Ishlab chiqarildi</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Maqsad</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Farq</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Defektlar</th>
                </tr>
              </thead>
              <tbody>
                {dailyProduction.map((day, index) => {
                  const difference = day.produced - day.target
                  return (
                    <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{day.date}</td>
                      <td className="py-3 px-4 text-right font-semibold text-success">{day.produced}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{day.target}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${difference > 0 ? 'text-success' : 'text-critical'}`}>
                        {difference > 0 ? '+' : ''}{difference}
                      </td>
                      <td className="py-3 px-4 text-right text-critical font-semibold">{day.defects}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

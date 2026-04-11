'use client'

import PageHeader from '@/components/dashboard/page-header'
import { monthlyTrendData, workshopPerformance } from '@/lib/mock-data'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function MainDashboard() {
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

        {/* Workshop Performance Comparison */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Ishlab chiqarish bo'limlari samaradorligi</h2>
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

        {/* Workshop Rankings Table */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Ishlab chiqarish bo'limlari reytingi</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Reyting</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Bo'lim nomi</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">GCA</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">FTQ</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">DRR</th>
                </tr>
              </thead>
              <tbody>
                {workshopPerformance.map((workshop) => (
                  <tr key={workshop.name} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-xs">
                        {workshop.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{workshop.name}</td>
                    <td className="py-3 px-4 text-right text-success font-semibold">{workshop.gca}%</td>
                    <td className="py-3 px-4 text-right text-warning font-semibold">{workshop.ftq}%</td>
                    <td className="py-3 px-4 text-right text-success font-semibold">{workshop.drr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

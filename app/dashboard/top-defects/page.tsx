'use client'

import PageHeader from '@/components/dashboard/page-header'
import { topDefects } from '@/lib/mock-data'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = [
  'var(--color-critical)',
  'var(--color-warning)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-muted)',
]

export default function TopDefectsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="Yuqori defektlar"
        description="Eng ko'p tarqalgan defekt turlarining tahlili va taqsimoti"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Yuqori defektlar' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Pie Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Defekt taqsimoti</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topDefects}
                dataKey="percent"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                label
              >
                {topDefects.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart by Workshop */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Ishlab chiqarish bo'limlari bo'yicha defektlar</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDefects}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <Bar 
                dataKey="count" 
                fill="var(--color-critical)" 
                name="Defektlar"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Table */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Defektlar ro'yxati</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">O'rin</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Defekt nomi</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Bo'lim</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Soni</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Foiz</th>
                </tr>
              </thead>
              <tbody>
                {topDefects.map((defect, index) => (
                  <tr key={defect.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-critical/20 text-critical font-bold text-xs">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{defect.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{defect.workshop}</td>
                    <td className="py-3 px-4 text-right font-semibold text-critical">{defect.count} ta</td>
                    <td className="py-3 px-4 text-right font-semibold text-critical">{defect.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Jami defektlar</p>
            <p className="text-3xl font-bold text-critical">224 ta</p>
            <p className="text-xs text-muted-foreground mt-2">8 turli xil defekt</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Eng ko'p defekt</p>
            <p className="text-3xl font-bold text-foreground">Paint scratch</p>
            <p className="text-xs text-critical mt-2">34 ta (15.2%)</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Eng ko'p bo'lim</p>
            <p className="text-3xl font-bold text-foreground">Boyama</p>
            <p className="text-xs text-muted-foreground mt-2">34 ta defekt</p>
          </div>
        </div>
      </div>
    </div>
  )
}

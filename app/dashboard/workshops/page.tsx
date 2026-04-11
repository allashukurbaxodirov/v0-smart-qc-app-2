'use client'

import PageHeader from '@/components/dashboard/page-header'
import { workshopPerformance, shiftPerformance } from '@/lib/mock-data'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import Link from 'next/link'

export default function WorkshopsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="Ishlab chiqarish bo'limlari"
        description="Har bir ishlab chiqarish bo'limi va shift samaradorligining batafsil tahlili"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ishlab chiqarish' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Workshop Comparison Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Bo'limlar bo'yicha KPI taqqoslash</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={workshopPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <Legend />
              <Bar dataKey="gca" fill="var(--color-chart-1)" name="GCA" />
              <Bar dataKey="ftq" fill="var(--color-chart-2)" name="FTQ" />
              <Bar dataKey="drr" fill="var(--color-chart-3)" name="DRR" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Workshop Ranking Table */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Bo'limlar reytingi</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Reyting</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Bo'lim nomi</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">GCA</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">FTQ</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">DRR</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {workshopPerformance.map((workshop) => {
                  const status = workshop.gca >= 96 ? 'good' : workshop.gca >= 95 ? 'warning' : 'critical'
                  const statusColor = status === 'good' ? 'text-success' : status === 'warning' ? 'text-warning' : 'text-critical'
                  
                  return (
                    <tr key={workshop.name} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-xs">
                          {workshop.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">{workshop.name}</td>
                      <td className="py-3 px-4 text-center text-foreground font-medium">{workshop.gca}%</td>
                      <td className="py-3 px-4 text-center text-foreground font-medium">{workshop.ftq}%</td>
                      <td className="py-3 px-4 text-center text-foreground font-medium">{workshop.drr}%</td>
                      <td className={`py-3 px-4 text-center font-semibold ${statusColor}`}>
                        {status === 'good' ? '✓ Yaxshi' : status === 'warning' ? '⚠ Diqqat' : '✕ Yomon'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/dashboard/workshops/${workshop.name.replace(/\s+/g, '-').toLowerCase()}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Eye className="w-4 h-4" />
                            Batafsil
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shift Performance */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Shift samaradorligi</h2>
          <div className="space-y-6">
            {shiftPerformance.map((shift) => (
              <div key={shift.name} className="border-b border-border pb-6 last:border-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{shift.name}</h3>
                  <Badge variant={shift.efficiency >= 90 ? 'default' : shift.efficiency >= 85 ? 'secondary' : 'destructive'}>
                    {shift.efficiency}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Samaradorlik:</span>
                    <span className="font-semibold text-foreground">{shift.efficiency}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        shift.efficiency >= 90 ? 'bg-success' : shift.efficiency >= 85 ? 'bg-warning' : 'bg-critical'
                      }`}
                      style={{ width: `${shift.efficiency}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ishlab chiqarildi</p>
                      <p className="text-lg font-bold text-foreground">{shift.output} ta</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Defektlar</p>
                      <p className="text-lg font-bold text-critical">{shift.defects} ta</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Eng yaxshi bo'lim</p>
            <p className="text-lg font-bold text-foreground">{workshopPerformance[0].name}</p>
            <p className="text-xs text-success mt-2">GCA: {workshopPerformance[0].gca}%</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">O'rtacha GCA</p>
            <p className="text-lg font-bold text-foreground">
              {(workshopPerformance.reduce((a, w) => a + w.gca, 0) / workshopPerformance.length).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-2">Barcha bo'limlar</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">O'rtacha shift samaradorligi</p>
            <p className="text-lg font-bold text-foreground">
              {(shiftPerformance.reduce((a, s) => a + s.efficiency, 0) / shiftPerformance.length).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-2">Barcha shiftlar</p>
          </div>
        </div>
      </div>
    </div>
  )
}

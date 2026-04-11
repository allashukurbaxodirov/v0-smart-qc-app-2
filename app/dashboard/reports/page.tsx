'use client'

import PageHeader from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Download, Mail, FileText, Calendar } from 'lucide-react'

const reports = [
  {
    id: 'RPT-2024-04-11',
    title: 'Kunlik sifat tahlil hisoboti',
    date: '2024-04-11',
    type: 'Kunlik',
    status: 'Tayyor',
  },
  {
    id: 'RPT-2024-04-10',
    title: 'Kunlik sifat tahlil hisoboti',
    date: '2024-04-10',
    type: 'Kunlik',
    status: 'Tayyor',
  },
  {
    id: 'RPT-2024-W15',
    title: 'Haftaviy KPI hisoboti',
    date: '2024-04-08',
    type: 'Haftaviy',
    status: 'Tayyor',
  },
  {
    id: 'RPT-2024-03',
    title: 'Oylik sifat hisoboti',
    date: '2024-04-01',
    type: 'Oylik',
    status: 'Tayyor',
  },
  {
    id: 'RPT-2024-02',
    title: 'Oylik sifat hisoboti',
    date: '2024-03-01',
    type: 'Oylik',
    status: 'Arxivlangan',
  },
]

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Audit va Hisobotlar"
        description="Ishlab chiqarish sifati bo'yicha batafsil hisobotlar va audit ma'lumotlari"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Hisobotlar' },
        ]}
        actions={
          <Button size="sm" className="gap-2">
            <Mail className="w-4 h-4" />
            Jo'natish
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Quick Report Generation */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Hisobot yaratish</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col py-4 gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Kunlik hisobot</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Haftaviy hisobot</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Oylik hisobot</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-2">
              <FileText className="w-5 h-5" />
              <span className="text-sm">Custom hisobot</span>
            </Button>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Barcha hisobotlar</h2>
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">{report.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{report.date}</span>
                      <span>•</span>
                      <span>{report.type}</span>
                      <span>•</span>
                      <span>{report.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    report.status === 'Tayyor' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {report.status}
                  </span>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Avtomatik hisobot sozlamalari</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Kunlik hisobot</h3>
                <p className="text-sm text-muted-foreground">Har kun soat 18:00 da jo'natish</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border" />
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Haftaviy hisobot</h3>
                <p className="text-sm text-muted-foreground">Juma kuni soat 17:00 da jo'natish</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Oylik hisobot</h3>
                <p className="text-sm text-muted-foreground">Oyning oxirgi kuni soat 18:00 da jo'natish</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

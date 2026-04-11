'use client'

import PageHeader from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, RotateCcw } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Sozlamalar"
        description="Tizim sozlamalarini o'rnatish va boshqarish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sozlamalar' },
        ]}
      />

      <div className="p-6 max-w-2xl">
        {/* Company Settings */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Korxona ma'lumotlari</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Korxona nomi</label>
              <Input placeholder="UzAuto Motors" defaultValue="UzAuto Motors" className="bg-background border-border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Fabrika nomi</label>
              <Input placeholder="Tashkent Production Facility" defaultValue="Tashkent Production Facility" className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Shahar</label>
                <Input placeholder="Tashkent" defaultValue="Tashkent" className="bg-background border-border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Davlat</label>
                <Input placeholder="Uzbekistan" defaultValue="Uzbekistan" className="bg-background border-border" />
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Settings */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Dashboard sozlamalari</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Qora mavzu (Dark Mode)</h3>
                <p className="text-sm text-muted-foreground">Qora interfeys ishlatish</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-border" defaultChecked />
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Bildirishnomalarni yoqish</h3>
                <p className="text-sm text-muted-foreground">Muhim hodisalar haqida xabarnoma olish</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-border" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Avtomatik yangilanish</h3>
                <p className="text-sm text-muted-foreground">Ko'rsatkichlarni har 5 minutda yangilash</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-border" defaultChecked />
            </div>
          </div>
        </div>

        {/* KPI Targets */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">KPI maqsadlari</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">GCA maqsadi (%)</label>
              <Input type="number" placeholder="98.0" defaultValue="98.0" className="bg-background border-border" max="100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">FTQ maqsadi (%)</label>
              <Input type="number" placeholder="92.0" defaultValue="92.0" className="bg-background border-border" max="100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">DRR maqsadi (%)</label>
              <Input type="number" placeholder="95.0" defaultValue="95.0" className="bg-background border-border" max="100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">CMM maqsadi (%)</label>
              <Input type="number" placeholder="96.0" defaultValue="96.0" className="bg-background border-border" max="100" />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Xabarnoma sozlamalari</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Critical ogohilantirish</h3>
                <p className="text-sm text-muted-foreground">KPI maqsaddan pastga tushganda</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-border" defaultChecked />
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">Kunlik me'raj xabar</h3>
                <p className="text-sm text-muted-foreground">Har kun soat 09:00 da kunlik xulosa</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-border" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Defekt yuqori bo'lganida</h3>
                <p className="text-sm text-muted-foreground">Defekt soni belgilangan chegaradan oshganda</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-border" defaultChecked />
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-muted/50 border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tizim ma'lumotlari</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tizim versiyasi:</span>
              <span className="font-medium text-foreground">v2.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">So'ngi yangilanish:</span>
              <span className="font-medium text-foreground">2024-04-10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ma'lumotlar bazasi:</span>
              <span className="font-medium text-foreground">PostgreSQL 15.2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Server status:</span>
              <span className="font-medium text-success">🟢 Normal</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button size="lg" className="gap-2">
            <Save className="w-4 h-4" />
            Saqlash
          </Button>
          <Button variant="outline" size="lg" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Bekorish
          </Button>
        </div>
      </div>
    </div>
  )
}

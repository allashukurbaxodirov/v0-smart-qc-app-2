'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, RotateCcw, CheckCircle2, Loader2, Server, Database, Code2 } from 'lucide-react'
import type { AppSettings } from '@/app/api/settings/route'

const DEFAULTS: AppSettings = {
  companyName:      'UzAuto Motors',
  factoryName:      'Tashkent Production Facility',
  city:             'Tashkent',
  country:          'Uzbekistan',
  darkMode:         true,
  notifications:    true,
  autoRefresh:      true,
  gcaTarget:        98.0,
  ftqTarget:        92.0,
  drrTarget:        95.0,
  cmmTarget:        96.0,
  alertCritical:    true,
  alertDailyReport: true,
  alertHighDefect:  true,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [saved,    setSaved]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'offline'>('checking')
  const [session,  setSession]  = useState<{ role: string } | null>(null)

  useEffect(() => {
    // Settings yuklash
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSettings(d) })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Session
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setSession(d) })

    // DB holati
    fetch('/api/users')
      .then(r => setDbStatus(r.ok ? 'ok' : 'offline'))
      .catch(() => setDbStatus('offline'))
  }, [])

  const isAdmin = session?.role === 'superadmin' || session?.role === 'admin'

  const set = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) =>
    setSettings(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {}
    setSaving(false)
  }

  const handleReset = () => setSettings(DEFAULTS)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

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

      <div className="p-6 max-w-2xl space-y-6">

        {/* Success banner */}
        {saved && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <p className="text-sm font-semibold text-success">Sozlamalar muvaffaqiyatli saqlandi</p>
          </div>
        )}

        {!isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-sm text-amber-600 font-medium">Sozlamalarni faqat admin o'zgartira oladi. Siz faqat ko'rishingiz mumkin.</p>
          </div>
        )}

        {/* Korxona ma'lumotlari */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Korxona ma'lumotlari</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Korxona nomi</label>
              <Input
                value={settings.companyName}
                onChange={e => set('companyName', e.target.value)}
                disabled={!isAdmin}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Fabrika nomi</label>
              <Input
                value={settings.factoryName}
                onChange={e => set('factoryName', e.target.value)}
                disabled={!isAdmin}
                className="bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Shahar</label>
                <Input
                  value={settings.city}
                  onChange={e => set('city', e.target.value)}
                  disabled={!isAdmin}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Davlat</label>
                <Input
                  value={settings.country}
                  onChange={e => set('country', e.target.value)}
                  disabled={!isAdmin}
                  className="bg-background border-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard sozlamalari */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Dashboard sozlamalari</h2>
          <div className="space-y-4">
            {([
              { key: 'darkMode',      label: 'Qora mavzu (Dark Mode)',    desc: 'Qora interfeys ishlatish'                       },
              { key: 'notifications', label: 'Bildirishnomalarni yoqish', desc: 'Muhim hodisalar haqida xabarnoma olish'          },
              { key: 'autoRefresh',   label: 'Avtomatik yangilanish',     desc: "Ko'rsatkichlarni har 5 minutda yangilash"        },
            ] as { key: keyof AppSettings; label: string; desc: string }[]).map(({ key, label, desc }, i, arr) => (
              <div key={key} className={`flex items-center justify-between ${i < arr.length - 1 ? 'pb-4 border-b border-border' : ''}`}>
                <div>
                  <h3 className="font-semibold text-foreground">{label}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => set(key, !settings[key] as any)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings[key] ? 'bg-primary' : 'bg-muted'
                  } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings[key] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Targetlar */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">KPI maqsadlari (%)</h2>
          <div className="grid grid-cols-2 gap-4">
            {([
              { key: 'gcaTarget', label: 'GCA maqsadi' },
              { key: 'ftqTarget', label: 'FTQ maqsadi' },
              { key: 'drrTarget', label: 'DRR maqsadi' },
              { key: 'cmmTarget', label: 'CMM maqsadi' },
            ] as { key: keyof AppSettings; label: string }[]).map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings[key] as number}
                    onChange={e => set(key, parseFloat(e.target.value) || 0 as any)}
                    disabled={!isAdmin}
                    step="0.5"
                    min="0"
                    max="100"
                    className="bg-background border-border"
                  />
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Xabarnoma sozlamalari */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Xabarnoma sozlamalari</h2>
          <div className="space-y-4">
            {([
              { key: 'alertCritical',    label: 'Critical ogohilantirish', desc: "KPI maqsaddan pastga tushganda"                   },
              { key: 'alertDailyReport', label: "Kunlik me'raj xabar",     desc: "Har kun soat 09:00 da kunlik xulosa"              },
              { key: 'alertHighDefect',  label: "Defekt yuqori bo'lganida", desc: "Defekt soni belgilangan chegaradan oshganda"      },
            ] as { key: keyof AppSettings; label: string; desc: string }[]).map(({ key, label, desc }, i, arr) => (
              <div key={key} className={`flex items-center justify-between ${i < arr.length - 1 ? 'pb-4 border-b border-border' : ''}`}>
                <div>
                  <h3 className="font-semibold text-foreground">{label}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => set(key, !settings[key] as any)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings[key] ? 'bg-primary' : 'bg-muted'
                  } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings[key] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tizim ma'lumotlari */}
        <div className="bg-muted/50 border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tizim ma'lumotlari</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Code2 className="w-4 h-4" /> Tizim versiyasi:</span>
              <span className="font-medium text-foreground">v2.1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Server className="w-4 h-4" /> Framework:</span>
              <span className="font-medium text-foreground">Next.js 16.2 (Turbopack)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Database className="w-4 h-4" /> Ma'lumotlar bazasi:</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dbStatus === 'ok' ? 'bg-success' : dbStatus === 'offline' ? 'bg-critical' : 'bg-warning'}`} />
                <span className={`font-medium ${dbStatus === 'ok' ? 'text-success' : dbStatus === 'offline' ? 'text-critical' : 'text-warning'}`}>
                  {dbStatus === 'ok' ? 'PostgreSQL — Ulanish normal' : dbStatus === 'offline' ? 'Offline — Cache rejimi' : 'Tekshirilmoqda...'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">So'ngi yangilanish:</span>
              <span className="font-medium text-foreground">{new Date().toLocaleDateString('uz-UZ')}</span>
            </div>
          </div>
        </div>

        {/* Tugmalar */}
        {isAdmin && (
          <div className="flex gap-3">
            <Button size="lg" className="gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
            <Button variant="outline" size="lg" className="gap-2" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              Standartga qaytarish
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

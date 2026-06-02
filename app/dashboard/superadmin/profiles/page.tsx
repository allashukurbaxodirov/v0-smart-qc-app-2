'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronLeft,
  ExternalLink, RefreshCw, Users, Shield, Database,
  Clock, Lock, Zap, Globe, Activity,
} from 'lucide-react'
import Link from 'next/link'

// ─── Barcha rollar va ularning konfiguratsiyasi ────────────────────────────────
const PROFILES = [
  {
    role: 'superadmin',
    label: 'Super Admin',
    color: 'text-yellow-600',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    dot: 'bg-yellow-500',
    path: '/dashboard/superadmin',
    features: {
      'Foydalanuvchi boshqaruvi': true,
      'Audit log':                true,
      'WDPV Targetlar':           true,
      'Shift/Shop locking':       false,
      'DB-backed storage':        true,
      'Rol cheklovi':             false,
    },
    apis: ['/api/users', '/api/audit', '/api/settings'],
    issues: [],
  },
  {
    role: 'admin',
    label: 'Admin',
    color: 'text-purple-600',
    bg: 'bg-purple-500/10 border-purple-500/30',
    dot: 'bg-purple-500',
    path: '/dashboard',
    features: {
      'Foydalanuvchi boshqaruvi': true,
      'Audit log':                true,
      'Shift/Shop locking':       false,
      'DB-backed storage':        true,
      'Rol cheklovi':             false,
    },
    apis: ['/api/users', '/api/audit'],
    issues: [],
  },
  {
    role: 'manager',
    label: 'Rahbar (Manager)',
    color: 'text-blue-600',
    bg: 'bg-blue-500/10 border-blue-500/30',
    dot: 'bg-blue-500',
    path: '/dashboard/manager',
    features: {
      'Smena yozuvlari':     true,
      'KPI dashboard':       true,
      'DB-backed storage':   true,
      'Shift/Shop locking':  false,
      'Grafik/Chart':        true,
    },
    apis: ['/api/shift-entries'],
    issues: [],
  },
  {
    role: 'gca_auditor',
    label: 'GCA Auditor',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    dot: 'bg-emerald-500',
    path: '/dashboard/gca-admin',
    features: {
      'Nuqson kiritish':    true,
      'Shift lock':         true,
      'Shop lock':          true,
      'DB-backed storage':  true,
      'Sektor tanlash':     true,
    },
    apis: ['/api/me', '/api/gca'],
    issues: [],
  },
  {
    role: 'd10_inspector',
    label: 'D10 Inspector',
    color: 'text-sky-600',
    bg: 'bg-sky-500/10 border-sky-500/30',
    dot: 'bg-sky-500',
    path: '/dashboard/d10-admin',
    features: {
      'Nuqson kiritish':   true,
      'Shift lock':        true,
      'Shop lock':         true,
      'DB-backed storage': true,
      'Sektor tanlash':    true,
    },
    apis: ['/api/me', '/api/qrecords'],
    issues: [],
  },
  {
    role: 'd20_inspector',
    label: 'D20 Inspector',
    color: 'text-indigo-600',
    bg: 'bg-indigo-500/10 border-indigo-500/30',
    dot: 'bg-indigo-500',
    path: '/dashboard/d20-admin',
    features: {
      'Nuqson kiritish':   true,
      'Shift lock':        true,
      'Shop lock':         true,
      'DB-backed storage': true,
      'Sektor tanlash':    true,
    },
    apis: ['/api/me', '/api/qrecords'],
    issues: [],
  },
  {
    role: 'drr_inspector',
    label: 'DRR Inspector',
    color: 'text-orange-600',
    bg: 'bg-orange-500/10 border-orange-500/30',
    dot: 'bg-orange-500',
    path: '/dashboard/drr-admin',
    features: {
      'Nuqson kiritish':   true,
      'Shift lock':        true,
      'Shop lock':         true,
      'DB-backed storage': true,
      'Sektor tanlash':    true,
    },
    apis: ['/api/me', '/api/qrecords'],
    issues: [],
  },
  {
    role: 'drl_inspector',
    label: 'DRL Inspector',
    color: 'text-amber-600',
    bg: 'bg-amber-500/10 border-amber-500/30',
    dot: 'bg-amber-500',
    path: '/dashboard/drl-admin',
    features: {
      'Nuqson kiritish':   true,
      'Shift lock':        true,
      'Shop lock':         true,
      'DB-backed storage': true,
      'Sektor tanlash':    true,
    },
    apis: ['/api/me', '/api/qrecords'],
    issues: [],
  },
  {
    role: 'pdi_inspector',
    label: 'PDI Inspector',
    color: 'text-rose-600',
    bg: 'bg-rose-500/10 border-rose-500/30',
    dot: 'bg-rose-500',
    path: '/dashboard/pdi-admin',
    features: {
      'Nuqson kiritish':   true,
      'Shift lock':        true,
      'Shop lock':         true,
      'DB-backed storage': true,
      'Sektor tanlash':    true,
    },
    apis: ['/api/me', '/api/qrecords'],
    issues: [],
  },
  {
    role: 'ga_engineer',
    label: 'GA Engineer',
    color: 'text-violet-600',
    bg: 'bg-violet-500/10 border-violet-500/30',
    dot: 'bg-violet-500',
    path: '/dashboard/ga-engineer',
    features: {
      'Nuqson bartaraf etish': true,
      'Shift lock':            false,
      'Shop lock':             false,
      'DB-backed storage':     true,
      'Statistika tab':        true,
    },
    apis: ['/api/me', '/api/resolutions', '/api/gca'],
    issues: ['Shift va Shop lock yo\'q (engineer uchun talab qilinmaydi — bu to\'g\'ri)'],
  },
  {
    role: 'welding_engineer',
    label: 'Welding Engineer',
    color: 'text-pink-600',
    bg: 'bg-pink-500/10 border-pink-500/30',
    dot: 'bg-pink-500',
    path: '/dashboard/welding-engineer',
    features: {
      'Nuqson bartaraf etish': true,
      'Shift lock':            false,
      'Shop lock':             false,
      'DB-backed storage':     true,
      'Statistika tab':        true,
    },
    apis: ['/api/me', '/api/resolutions', '/api/d-records'],
    issues: [],
  },
  {
    role: 'incoming_inspector',
    label: 'Incoming Inspector',
    color: 'text-cyan-600',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    dot: 'bg-cyan-500',
    path: '/dashboard/incoming-admin',
    features: {
      'Kiruvchi detal qayd':  true,
      'Shift lock':           true,
      'Shop lock':            false,
      'DB-backed storage':    true,
      'KPI kartochkalar':     true,
    },
    apis: ['/api/me', '/api/incoming'],
    issues: [],
  },
]

// ─── API endpoint testlari ────────────────────────────────────────────────────
interface ApiStatus {
  path:   string
  status: number | null
  ok:     boolean
  ms:     number
}

// ─── Foydalanuvchilar ma'lumotlari ────────────────────────────────────────────
interface UserRow {
  id:           string
  tabel_number: string
  name:         string
  role:         string
  shift:        string | null
  shop:         string | null
}

export default function ProfilesPage() {
  const [users,     setUsers]     = useState<UserRow[]>([])
  const [apiStatus, setApiStatus] = useState<Record<string, ApiStatus>>({})
  const [testing,   setTesting]   = useState(false)
  const [filter,    setFilter]    = useState<'all' | 'issues' | 'ok'>('all')

  // Foydalanuvchilarni yuklash
  useEffect(() => {
    fetch('/api/users').then(r => r.ok ? r.json() : []).then(d => setUsers(d)).catch(() => {})
  }, [])

  // Barcha API endpointlarni test qilish
  const runApiTests = async () => {
    setTesting(true)
    const endpoints = [...new Set(PROFILES.flatMap(p => p.apis))]
    const results: Record<string, ApiStatus> = {}

    await Promise.all(endpoints.map(async (path) => {
      const t0 = performance.now()
      try {
        const r = await fetch(path)
        results[path] = { path, status: r.status, ok: r.status < 500, ms: Math.round(performance.now() - t0) }
      } catch {
        results[path] = { path, status: null, ok: false, ms: Math.round(performance.now() - t0) }
      }
    }))

    setApiStatus(results)
    setTesting(false)
  }

  // Har bir profil uchun foydalanuvchilar soni
  const usersByRole = (role: string) => users.filter(u => u.role === role)

  // Shift/shop yo'q foydalanuvchilar
  const missingShift = (role: string) => usersByRole(role).filter(u => !u.shift)
  const missingShop  = (role: string) => usersByRole(role).filter(u => !u.shop)

  // Real kamchiliklar (konfiguratsiya + ma'lumot)
  const getIssues = (p: typeof PROFILES[0]) => {
    const issues = [...p.issues]
    const roleMeta = PROFILES.find(x => x.role === p.role)!
    const needsShift = ['gca_auditor','d10_inspector','d20_inspector','drr_inspector','drl_inspector','pdi_inspector','incoming_inspector'].includes(p.role)
    const needsShop  = ['gca_auditor','d10_inspector','d20_inspector','drr_inspector','drl_inspector','pdi_inspector','ga_engineer','welding_engineer'].includes(p.role)
    if (needsShift && missingShift(p.role).length > 0)
      issues.push(`${missingShift(p.role).length} ta foydalanuvchida shift tayinlanmagan`)
    if (needsShop && missingShop(p.role).length > 0)
      issues.push(`${missingShop(p.role).length} ta foydalanuvchida shop tayinlanmagan`)
    return issues
  }

  const totalIssues = PROFILES.reduce((sum, p) => sum + getIssues(p).length, 0)

  const filtered = PROFILES.filter(p => {
    if (filter === 'issues') return getIssues(p).length > 0
    if (filter === 'ok')     return getIssues(p).length === 0
    return true
  })

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Profil holati — Diagnostika"
        description="Barcha 13 ta rol profillarining funksiyalari va kamchiliklari"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Superadmin', href: '/dashboard/superadmin' },
          { label: 'Profil diagnostika' },
        ]}
      />

      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/superadmin">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Orqaga
            </Button>
          </Link>

          {/* Umumiy statistika */}
          <div className="flex gap-3 ml-auto flex-wrap">
            <div className="px-4 py-2 bg-card border border-border rounded-lg text-sm">
              <span className="text-muted-foreground">Jami rollar: </span>
              <span className="font-bold text-foreground">{PROFILES.length}</span>
            </div>
            <div className={`px-4 py-2 rounded-lg border text-sm ${totalIssues > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-success/10 border-success/30'}`}>
              <span className="text-muted-foreground">Kamchiliklar: </span>
              <span className={`font-bold ${totalIssues > 0 ? 'text-amber-600' : 'text-success'}`}>{totalIssues}</span>
            </div>
            <Button
              onClick={runApiTests}
              disabled={testing}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              {testing ? 'Tekshirilmoqda...' : 'API test'}
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {([
            { key: 'all',    label: `Hammasi (${PROFILES.length})` },
            { key: 'issues', label: `Kamchiliklar (${PROFILES.filter(p => getIssues(p).length > 0).length})` },
            { key: 'ok',     label: `Normal (${PROFILES.filter(p => getIssues(p).length === 0).length})` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                filter === key
                  ? key === 'issues' ? 'bg-amber-500 border-amber-500 text-white'
                  : key === 'ok'     ? 'bg-success border-success text-white'
                  :                    'bg-primary border-primary text-primary-foreground'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Profil kartochkalar */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((profile) => {
            const roleUsers  = usersByRole(profile.role)
            const issues     = getIssues(profile)
            const hasIssues  = issues.length > 0
            const featList   = Object.entries(profile.features)
            const okCount    = featList.filter(([, v]) => v).length
            const totalFeat  = featList.length

            return (
              <div
                key={profile.role}
                className={`bg-card border-2 rounded-xl overflow-hidden ${
                  hasIssues ? 'border-amber-500/40' : 'border-success/30'
                }`}
              >
                {/* Header */}
                <div className={`px-4 py-3 flex items-center justify-between ${profile.bg}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${profile.dot}`} />
                    <div>
                      <p className={`font-bold text-sm ${profile.color}`}>{profile.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{profile.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasIssues
                      ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                      : <CheckCircle2 className="w-4 h-4 text-success" />}
                    <Link href={profile.path} target="_blank">
                      <button className="p-1 hover:bg-black/10 rounded transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </Link>
                  </div>
                </div>

                <div className="p-4 space-y-3">

                  {/* Foydalanuvchilar */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" /> Foydalanuvchilar
                    </span>
                    <span className="font-bold text-foreground">{roleUsers.length} ta</span>
                  </div>

                  {/* Progress bar: features */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Funksiyalar</span>
                      <span className="font-semibold">{okCount}/{totalFeat}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${okCount === totalFeat ? 'bg-success' : 'bg-amber-500'}`}
                        style={{ width: `${(okCount / totalFeat) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Funksiyalar ro'yxati */}
                  <div className="space-y-1">
                    {featList.map(([feat, ok]) => (
                      <div key={feat} className="flex items-center justify-between text-xs">
                        <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{feat}</span>
                        {ok
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                          : <XCircle     className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {/* API holati */}
                  {Object.keys(apiStatus).length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> API endpointlar
                      </p>
                      <div className="space-y-1">
                        {profile.apis.map(api => {
                          const s = apiStatus[api]
                          if (!s) return null
                          return (
                            <div key={api} className="flex items-center justify-between text-xs">
                              <span className="font-mono text-muted-foreground">{api}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">{s.ms}ms</span>
                                <span className={`px-1.5 py-0.5 rounded font-bold ${
                                  s.status === 200 || s.status === 401
                                    ? 'bg-success/15 text-success'
                                    : s.status === null
                                    ? 'bg-critical/15 text-critical'
                                    : 'bg-amber-500/15 text-amber-600'
                                }`}>
                                  {s.status ?? 'ERR'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Kamchiliklar */}
                  {issues.length > 0 && (
                    <div className="border-t border-amber-500/20 pt-2 space-y-1">
                      {issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Foydalanuvchilar ro'yxati */}
                  {roleUsers.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Tayinlangan
                      </p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {roleUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-muted-foreground">{u.tabel_number}</span>
                              <span className="text-foreground truncate max-w-[100px]">{u.name}</span>
                            </div>
                            <div className="flex gap-1">
                              {u.shift
                                ? <span className="px-1 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">{u.shift}</span>
                                : <span className="px-1 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[10px]">shift?</span>}
                              {u.shop
                                ? <span className="px-1 py-0.5 bg-success/10 text-success rounded text-[10px] truncate max-w-[60px]">{u.shop?.split(' ')[0]}</span>
                                : ['ga_engineer','welding_engineer','gca_auditor','d10_inspector','d20_inspector','drr_inspector','drl_inspector','pdi_inspector'].includes(profile.role)
                                  ? <span className="px-1 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[10px]">shop?</span>
                                  : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {roleUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Hali foydalanuvchi tayinlanmagan</p>
                  )}

                  {/* Sahifaga o'tish */}
                  <Link href={profile.path} target="_blank">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 mt-1 text-xs">
                      <ExternalLink className="w-3 h-3" /> Profilga o'tish
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* API endpointlar umumiy jadvali */}
        {Object.keys(apiStatus).length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4" /> Barcha API endpointlar holati
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.values(apiStatus).map(s => (
                  <div key={s.path} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-xs">
                    <span className="font-mono text-muted-foreground truncate">{s.path}</span>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{s.ms}ms</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        s.status === 200 || s.status === 401
                          ? 'bg-success/15 text-success'
                          : s.status === null
                          ? 'bg-critical/15 text-critical'
                          : 'bg-amber-500/15 text-amber-600'
                      }`}>
                        {s.status ?? 'ERR'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * 401 = normal (authentication kerak, endpoint ishlayapti) · 200 = to'liq ochiq · ERR = endpoint topilmadi
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

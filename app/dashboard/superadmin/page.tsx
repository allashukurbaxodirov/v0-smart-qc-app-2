'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Crown, Users, Target, Settings, Database,
  Plus, Trash2, Edit2, Save, RefreshCw,
  Eye, EyeOff, CheckCircle, AlertTriangle,
  X, UserPlus, ShieldCheck, Activity,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'

// ─── Rol ro'yxati ──────────────────────────────────────────────────────────────
const ROLES: { value: string; label: string; color: string }[] = [
  { value: 'superadmin',        label: 'Super Admin',         color: 'text-yellow-500' },
  { value: 'admin',             label: 'Admin',               color: 'text-purple-500' },
  { value: 'manager',           label: 'Rahbar',              color: 'text-blue-500'   },
  { value: 'gca_auditor',       label: 'GCA Auditor',         color: 'text-emerald-500'},
  { value: 'cmm_inspector',     label: 'CMM Inspector',       color: 'text-teal-500'   },
  { value: 'd10_inspector',     label: 'D10 Inspector',       color: 'text-sky-500'    },
  { value: 'd20_inspector',     label: 'D20 Inspector',       color: 'text-indigo-500' },
  { value: 'ga_engineer',       label: 'GA Engineer',         color: 'text-violet-500' },
  { value: 'welding_engineer',  label: 'Welding Engineer',    color: 'text-pink-500'   },
  { value: 'drr_inspector',     label: 'DRR Inspector',       color: 'text-orange-500' },
  { value: 'drl_inspector',     label: 'DRL Inspector',       color: 'text-amber-500'  },
  { value: 'pdi_inspector',     label: 'PDI Inspector',       color: 'text-rose-500'   },
  { value: 'incoming_inspector',label: 'Incoming Inspector',  color: 'text-cyan-500'   },
]

function roleMeta(value: string) {
  return ROLES.find(r => r.value === value) ?? { value, label: value, color: 'text-muted-foreground' }
}

// ─── GCA WDPV default targetlar ───────────────────────────────────────────────
const SHOPS_GCA = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const

const DEFAULT_TARGETS: Record<string, number> = {
  'PRESS SHOP': 0.40,
  'WELDING-1':  0.45,
  'WELDING-2':  0.45,
  'PAINT SHOP': 0.70,
  'GA':         0.50,
  'PLANT':      2.50,
}
const LS_TARGETS  = 'gca_wdpv_targets_v1'
const LS_VEHICLES = 'gca_vehicles_v1'

// ─── User type ────────────────────────────────────────────────────────────────
interface UserRow {
  id: string
  tabel_number: string
  email: string | null
  name: string
  role: string
  created_at: string
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: number; msg: string; ok: boolean }

export default function SuperAdminPage() {
  const [tab, setTab] = useState<'users' | 'targets' | 'data'>('users')

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toasts, setToasts]   = useState<Toast[]>([])
  const toast = useCallback((msg: string, ok = true) => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, msg, ok }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500)
  }, [])

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 1 — FOYDALANUVCHILAR
  // ══════════════════════════════════════════════════════════════════════════
  const [users, setUsers]         = useState<UserRow[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showAddForm, setShowAddForm]   = useState(false)

  // Add form state
  const [addTabel, setAddTabel]   = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addName, setAddName]     = useState('')
  const [addRole, setAddRole]     = useState('gca_auditor')
  const [showAddPwd, setShowAddPwd]   = useState(false)
  const [addLoading, setAddLoading]   = useState(false)

  // Edit state
  const [editId, setEditId]       = useState<string | null>(null)
  const [editName, setEditName]   = useState('')
  const [editRole, setEditRole]   = useState('')
  const [editPwd, setEditPwd]     = useState('')
  const [showEditPwd, setShowEditPwd] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
    } catch { toast('Foydalanuvchilarni yuklashda xatolik', false) }
    finally { setLoadingUsers(false) }
  }, [toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleAddUser = async () => {
    if (!addTabel || !addPassword || !addName) {
      toast("Barcha maydonlarni to'ldiring", false); return
    }
    setAddLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabelNumber: addTabel.toUpperCase(), password: addPassword, name: addName, role: addRole }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Xatolik', false); return }
      toast(`${addName} qo'shildi`)
      setAddTabel(''); setAddPassword(''); setAddName(''); setAddRole('gca_auditor')
      setShowAddForm(false)
      fetchUsers()
    } catch { toast('Tarmoq xatoligi', false) }
    finally { setAddLoading(false) }
  }

  const handleEditSave = async () => {
    if (!editId || !editName || !editRole) return
    setEditLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, name: editName, role: editRole, password: editPwd || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Xatolik', false); return }
      toast('Saqlandi')
      setEditId(null); setEditPwd('')
      fetchUsers()
    } catch { toast('Tarmoq xatoligi', false) }
    finally { setEditLoading(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Xatolik', false); return }
      toast("O'chirildi")
      setDeleteConfirmId(null)
      fetchUsers()
    } catch { toast('Tarmoq xatoligi', false) }
  }

  const startEdit = (u: UserRow) => {
    setEditId(u.id); setEditName(u.name); setEditRole(u.role); setEditPwd('')
    setShowEditPwd(false)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 2 — WDPV TARGETLAR
  // ══════════════════════════════════════════════════════════════════════════
  const [targets, setTargets]   = useState({ ...DEFAULT_TARGETS })
  const [vehicles, setVehicles] = useState(50)
  const [targetsSaved, setTargetsSaved] = useState(false)

  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_TARGETS)
      if (t) setTargets(prev => ({ ...prev, ...JSON.parse(t) }))
      const v = localStorage.getItem(LS_VEHICLES)
      if (v) setVehicles(Number(v))
    } catch {}
  }, [])

  const saveTargets = () => {
    try {
      localStorage.setItem(LS_TARGETS,  JSON.stringify(targets))
      localStorage.setItem(LS_VEHICLES, String(vehicles))
      window.dispatchEvent(new CustomEvent('gca_targets_updated'))
      setTargetsSaved(true)
      setTimeout(() => setTargetsSaved(false), 2000)
      toast('Targetlar saqlandi va barcha dashboardlarga qo\'llanildi')
    } catch { toast('Saqlashda xatolik', false) }
  }

  const resetTargets = () => {
    setTargets({ ...DEFAULT_TARGETS })
    setVehicles(50)
    toast('Standart qiymatlarga qaytarildi')
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 3 — MA'LUMOTLAR
  // ══════════════════════════════════════════════════════════════════════════
  const [stats, setStats] = useState({ gca: 0, d10: 0, d20: 0, qrecords: 0, incoming: 0 })
  const [loadingStats, setLoadingStats] = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState<string | null>(null)
  const [deleteInput, setDeleteInput]     = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/bulk-delete')
      const d = await res.json()
      setStats(d)
    } catch {}
    finally { setLoadingStats(false) }
  }, [])

  useEffect(() => {
    if (tab === 'data') fetchStats()
  }, [tab, fetchStats])

  const handleBulkDelete = async () => {
    if (deleteInput !== 'DELETE') { toast("\"DELETE\" deb yozing", false); return }
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/bulk-delete?table=${deleteTarget}&confirm=yes`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) { toast(d.error ?? 'Xatolik', false); return }
      toast(`${d.deleted} ta yozuv o'chirildi`)
      setDeleteTarget(null); setDeleteInput('')
      fetchStats()
    } catch { toast('Tarmoq xatoligi', false) }
    finally { setDeleteLoading(false) }
  }

  const TABLE_LABELS: Record<string, string> = {
    gca: 'GCA Yozuvlar',
    d10: 'D10 Yozuvlar',
    d20: 'D20 Yozuvlar',
    qrecords: 'QRecords (DRR/DRL/PDI)',
    incoming: 'Kiruvchi Nazorat',
  }

  // ─── Rol guruhlari (users tab stats) ─────────────────────────────────────
  const adminCount    = users.filter(u => ['superadmin','admin'].includes(u.role)).length
  const managerCount  = users.filter(u => u.role === 'manager').length
  const inspCount     = users.filter(u => u.role.includes('inspector') || u.role.includes('engineer') || u.role.includes('auditor')).length

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="SuperAdmin Panel"
        description="Tizimni to'liq boshqarish: foydalanuvchilar, targetlar, ma'lumotlar"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'SuperAdmin' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/40 text-yellow-600 text-xs font-bold">
              <Crown className="w-3.5 h-3.5" />
              SUPERADMIN
            </span>
          </div>
        }
      />

      {/* Toast messages */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto ${
            t.ok
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-700'
          }`}>
            {t.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            {t.msg}
          </div>
        ))}
      </div>

      <div className="p-6 space-y-6">

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border w-fit">
          {([
            { key: 'users',   label: 'Foydalanuvchilar', icon: <Users   className="w-4 h-4" /> },
            { key: 'targets', label: 'WDPV Targetlar',   icon: <Target  className="w-4 h-4" /> },
            { key: 'data',    label: "Ma'lumotlar",       icon: <Database className="w-4 h-4" /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key
                  ? 'bg-card border border-border shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: FOYDALANUVCHILAR
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="space-y-5">

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Jami foydalanuvchi', value: users.length,   icon: <Users className="w-5 h-5 text-blue-500" />,   bg: 'bg-blue-500/10   border-blue-500/30'   },
                { label: 'Admin / SuperAdmin',  value: adminCount,     icon: <Crown className="w-5 h-5 text-yellow-500" />, bg: 'bg-yellow-500/10 border-yellow-500/30' },
                { label: 'Rahbarlar',           value: managerCount,   icon: <ShieldCheck className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-500/10 border-purple-500/30' },
                { label: 'Inspektorlar',        value: inspCount,      icon: <Activity className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-500/10 border-emerald-500/30' },
              ].map(item => (
                <div key={item.label} className={`bg-card rounded-xl border p-4 ${item.bg}`}>
                  <div className="flex items-center justify-between mb-2">{item.icon}</div>
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Add user toggle */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-border">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Foydalanuvchilar ({users.length})
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
                    {loadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" onClick={() => setShowAddForm(v => !v)} className="gap-1.5">
                    {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {showAddForm ? 'Bekor qilish' : 'Yangi qo\'shish'}
                  </Button>
                </div>
              </div>

              {/* Add form */}
              {showAddForm && (
                <div className="px-5 py-5 bg-primary/5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground mb-4">Yangi foydalanuvchi</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium">Tabel raqami</label>
                      <input
                        value={addTabel}
                        onChange={e => setAddTabel(e.target.value.toUpperCase())}
                        placeholder="T014"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground font-mono tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium">To'liq ism</label>
                      <input
                        value={addName}
                        onChange={e => setAddName(e.target.value)}
                        placeholder="Ism familiya"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium">Parol</label>
                      <div className="relative">
                        <input
                          value={addPassword}
                          onChange={e => setAddPassword(e.target.value)}
                          type={showAddPwd ? 'text' : 'password'}
                          placeholder="Parol"
                          className="w-full px-3 py-2 pr-9 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button onClick={() => setShowAddPwd(v => !v)} className="absolute right-2.5 top-2.5 text-muted-foreground">
                          {showAddPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 md:col-span-2 lg:col-span-2">
                      <label className="text-xs text-muted-foreground font-medium">Rol</label>
                      <select
                        value={addRole}
                        onChange={e => setAddRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddUser} disabled={addLoading} className="w-full gap-1.5">
                        {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Qo'shish
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Users table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Tabel #</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Ism</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Rol</th>
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Qo'shilgan</th>
                      <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loadingUsers ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground italic">
                        Foydalanuvchilar topilmadi
                      </td></tr>
                    ) : users.map(u => (
                      <tr key={u.id} className={`transition-colors ${editId === u.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <td className="px-5 py-3">
                          <span className="font-mono font-bold text-sm text-primary">{u.tabel_number}</span>
                        </td>
                        <td className="px-5 py-3">
                          {editId === u.id ? (
                            <input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-background border border-primary/40 text-sm text-foreground focus:outline-none w-36"
                            />
                          ) : (
                            <span className="font-medium text-foreground">{u.name}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {editId === u.id ? (
                            <select
                              value={editRole}
                              onChange={e => setEditRole(e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg bg-background border border-primary/40 text-sm text-foreground focus:outline-none"
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          ) : (
                            <span className={`text-xs font-semibold ${roleMeta(u.role).color}`}>
                              {roleMeta(u.role).label}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {editId === u.id ? (
                              <>
                                {/* Password reset field */}
                                <div className="relative mr-1">
                                  <input
                                    value={editPwd}
                                    onChange={e => setEditPwd(e.target.value)}
                                    type={showEditPwd ? 'text' : 'password'}
                                    placeholder="Yangi parol (ixtiyoriy)"
                                    className="px-2.5 py-1.5 pr-8 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none w-40"
                                  />
                                  <button onClick={() => setShowEditPwd(v => !v)} className="absolute right-2 top-2 text-muted-foreground">
                                    {showEditPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <Button size="sm" onClick={handleEditSave} disabled={editLoading} className="gap-1 h-8">
                                  {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                  Saqlash
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="h-8">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : deleteConfirmId === u.id ? (
                              <>
                                <span className="text-xs text-rose-500 mr-1">Haqiqatan o'chirilsinmi?</span>
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)} className="h-8 text-xs">
                                  Ha, o'chir
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(null)} className="h-8">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => startEdit(u)} className="h-8 w-8 p-0">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm" variant="ghost"
                                  onClick={() => setDeleteConfirmId(u.id)}
                                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: WDPV TARGETLAR
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'targets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Sehlar targetlari */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-primary/5">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Sehlar bo'yicha WDPV Targetlar
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Avtomobil boshiga nuqson soni (WDPV) chegaralari</p>
              </div>
              <div className="divide-y divide-border/60">
                {SHOPS_GCA.map(shop => (
                  <div key={shop} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{shop}</p>
                      <p className="text-xs text-muted-foreground">
                        Standart: {DEFAULT_TARGETS[shop]}
                        {targets[shop] !== DEFAULT_TARGETS[shop] && (
                          <span className="ml-2 text-primary font-medium">→ O'zgartirilgan</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Target:</span>
                      <input
                        type="number"
                        min={0.01}
                        max={10}
                        step={0.01}
                        value={targets[shop] ?? DEFAULT_TARGETS[shop]}
                        onChange={e => setTargets(t => ({ ...t, [shop]: parseFloat(e.target.value) || DEFAULT_TARGETS[shop] }))}
                        className="w-20 px-2.5 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Plant + Vehicles */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-primary/5">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Zavod jami va Avtomobillar
                  </h2>
                </div>
                <div className="px-5 py-5 space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-2">
                      PLANT (Zavod jami) WDPV Target
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0.1}
                        max={20}
                        step={0.1}
                        value={targets['PLANT'] ?? DEFAULT_TARGETS['PLANT']}
                        onChange={e => setTargets(t => ({ ...t, 'PLANT': parseFloat(e.target.value) || DEFAULT_TARGETS['PLANT'] }))}
                        className="w-28 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <span className="text-xs text-muted-foreground">Standart: {DEFAULT_TARGETS['PLANT']}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-2">
                      Smena avtomobillari soni
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      WDPV = Jami nuqson soni / Avtomobil soni — bu qiymat hisoblashga ta'sir qiladi
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        step={1}
                        value={vehicles}
                        onChange={e => setVehicles(parseInt(e.target.value) || 50)}
                        className="w-28 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <span className="text-xs text-muted-foreground">Standart: 50</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* WDPV status legend */}
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground mb-3">Status chegaralari (ko'rsatma)</p>
                <div className="space-y-2.5 text-sm">
                  {SHOPS_GCA.map(shop => {
                    const t = targets[shop] ?? DEFAULT_TARGETS[shop]
                    return (
                      <div key={shop} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{shop}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">≤ {t.toFixed(2)} Normal</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30">≤ {(t * 1.5).toFixed(2)} Diqqat</span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 border border-rose-500/30">&gt; {(t * 1.5).toFixed(2)} Kritik</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <Button onClick={saveTargets} className="gap-2 flex-1">
                  {targetsSaved
                    ? <><CheckCircle className="w-4 h-4" />Saqlandi!</>
                    : <><Save className="w-4 h-4" />Saqlash va qo'llash</>
                  }
                </Button>
                <Button onClick={resetTargets} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: MA'LUMOTLAR
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'data' && (
          <div className="space-y-5">

            {/* Stats */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Jadvallar statistikasi
                </h2>
                <Button variant="outline" size="sm" onClick={fetchStats} disabled={loadingStats}>
                  {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-border/60">
                {([
                  { key: 'gca',      label: 'GCA',     color: 'text-blue-500',    bg: 'bg-blue-500/5'    },
                  { key: 'd10',      label: 'D10',     color: 'text-indigo-500',  bg: 'bg-indigo-500/5'  },
                  { key: 'd20',      label: 'D20',     color: 'text-violet-500',  bg: 'bg-violet-500/5'  },
                  { key: 'qrecords', label: 'QRecords',color: 'text-amber-500',   bg: 'bg-amber-500/5'   },
                  { key: 'incoming', label: 'Incoming', color: 'text-cyan-500',   bg: 'bg-cyan-500/5'    },
                ] as const).map(item => (
                  <div key={item.key} className={`px-5 py-5 ${item.bg}`}>
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className={`text-3xl font-bold ${item.color}`}>
                      {loadingStats ? '–' : stats[item.key]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">yozuv</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bulk delete */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-rose-500/5">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Ommaviy o'chirish
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Barcha yozuvlar o'chiriladi — bu amalni qaytarib bo'lmaydi!</p>
              </div>
              <div className="divide-y divide-border/60">
                {(['gca','d10','d20','qrecords','incoming'] as const).map(key => (
                  <div key={key} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{TABLE_LABELS[key]}</p>
                      <p className="text-xs text-muted-foreground">{stats[key]} ta yozuv mavjud</p>
                    </div>
                    {deleteTarget === key ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={deleteInput}
                          onChange={e => setDeleteInput(e.target.value)}
                          placeholder={'DELETE yozing'}
                          className="px-3 py-1.5 rounded-lg bg-background border border-rose-500/40 text-sm text-foreground focus:outline-none w-36"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleBulkDelete}
                          disabled={deleteLoading || deleteInput !== 'DELETE'}
                          className="gap-1"
                        >
                          {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          O'chir
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteInput('') }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setDeleteTarget(key); setDeleteInput('') }}
                        disabled={stats[key] === 0}
                        className="gap-1.5 text-rose-500 border-rose-500/40 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Barchasini o'chir
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-rose-500/5 text-xs text-rose-500/80">
                Tasdiqlash uchun "DELETE" deb yozing — bu amalni bekor qilib bo'lmaydi.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

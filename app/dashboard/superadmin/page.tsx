'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Crown, Users, Target, Database, Shield,
  Plus, Trash2, Edit2, Save, RefreshCw,
  Eye, EyeOff, CheckCircle, AlertTriangle,
  X, UserPlus, ShieldCheck, Activity,
  Loader2, Search, LogIn,
  AlertCircle, Key,
  Clock, UserX,
} from 'lucide-react'

// ─── Konstantalar ─────────────────────────────────────────────────────────────
const ROLES: {
  value: string; label: string
  color: string; bg: string
  needsShift?: boolean; needsShop?: boolean
}[] = [
  { value: 'superadmin',         label: 'Super Admin',         color: 'text-yellow-600',  bg: 'bg-yellow-500/15 border-yellow-500/40' },
  { value: 'admin',              label: 'Admin',               color: 'text-purple-600',  bg: 'bg-purple-500/15 border-purple-500/40' },
  { value: 'manager',            label: 'Rahbar',              color: 'text-blue-600',    bg: 'bg-blue-500/15   border-blue-500/40'   },
  { value: 'gca_auditor',        label: 'GCA Auditor',         color: 'text-emerald-600', bg: 'bg-emerald-500/15 border-emerald-500/40', needsShift: true, needsShop: true  },
  { value: 'cmm_inspector',      label: 'CMM Inspector',       color: 'text-teal-600',    bg: 'bg-teal-500/15   border-teal-500/40',    needsShift: true, needsShop: true  },
  { value: 'd10_inspector',      label: 'D10 Inspector',       color: 'text-sky-600',     bg: 'bg-sky-500/15    border-sky-500/40',     needsShift: true, needsShop: true  },
  { value: 'd20_inspector',      label: 'D20 Inspector',       color: 'text-indigo-600',  bg: 'bg-indigo-500/15 border-indigo-500/40',  needsShift: true, needsShop: true  },
  { value: 'ga_engineer',        label: 'GA Engineer',         color: 'text-violet-600',  bg: 'bg-violet-500/15 border-violet-500/40',  needsShift: false, needsShop: true  },
  { value: 'welding_engineer',   label: 'Welding Engineer',    color: 'text-pink-600',    bg: 'bg-pink-500/15   border-pink-500/40',    needsShift: false, needsShop: true  },
  { value: 'drr_inspector',      label: 'DRR Inspector',       color: 'text-orange-600',  bg: 'bg-orange-500/15 border-orange-500/40',  needsShift: true, needsShop: true  },
  { value: 'drl_inspector',      label: 'DRL Inspector',       color: 'text-amber-600',   bg: 'bg-amber-500/15  border-amber-500/40',   needsShift: true, needsShop: true  },
  { value: 'pdi_inspector',      label: 'PDI Inspector',       color: 'text-rose-600',    bg: 'bg-rose-500/15   border-rose-500/40',    needsShift: true, needsShop: true  },
  { value: 'incoming_inspector', label: 'Incoming Inspector',  color: 'text-cyan-600',    bg: 'bg-cyan-500/15   border-cyan-500/40',    needsShift: true, needsShop: false },
]

const ALL_SHOPS = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA']
const SHIFTS    = ['A', 'B', 'D']
const SHOPS_GCA = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const
const DEFAULT_TARGETS: Record<string, number> = {
  'PRESS SHOP': 0.40, 'WELDING-1': 0.45, 'WELDING-2': 0.45, 'PAINT SHOP': 0.70, 'GA': 0.50, 'PLANT': 2.50,
}
const LS_TARGETS  = 'gca_wdpv_targets_v1'
const LS_VEHICLES = 'gca_vehicles_v1'

function rm(value: string) {
  return ROLES.find(r => r.value === value) ?? { value, label: value, color: 'text-muted-foreground', bg: 'bg-muted/30 border-border', needsShift: false, needsShop: false }
}

// ─── Tiplар ───────────────────────────────────────────────────────────────────
interface UserRow {
  id: string; tabel_number: string; email: string | null
  name: string; role: string; shift: string | null; shop: string | null; created_at: string
}
interface AuditEntry {
  id: string; ts: string; actor: string; actorName: string; actorRole: string
  action: string; target?: string; details?: string; ok: boolean
}
interface AuditStats { total: number; todayCount: number; failCount: number; loginFails: number }
interface Toast { id: number; msg: string; ok: boolean }

// ─── Yordamchi ────────────────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  LOGIN:          { label: 'Kirish',              icon: <LogIn      className="w-3.5 h-3.5" />, color: 'text-emerald-600 bg-emerald-500/10' },
  LOGIN_FAIL:     { label: 'Muvaffaqiyatsiz',     icon: <UserX      className="w-3.5 h-3.5" />, color: 'text-rose-600    bg-rose-500/10'    },
  LOGOUT:         { label: 'Chiqish',             icon: <LogIn      className="w-3.5 h-3.5" />, color: 'text-slate-600   bg-slate-500/10'   },
  CREATE_USER:    { label: 'Foydalanuvchi qo\'shdi', icon: <UserPlus className="w-3.5 h-3.5" />, color: 'text-blue-600    bg-blue-500/10'    },
  EDIT_USER:      { label: 'Tahrirladi',          icon: <Edit2      className="w-3.5 h-3.5" />, color: 'text-amber-600   bg-amber-500/10'   },
  DELETE_USER:    { label: "O'chirdi",            icon: <Trash2     className="w-3.5 h-3.5" />, color: 'text-rose-600    bg-rose-500/10'    },
  RESET_PASSWORD: { label: 'Parol yangiladi',     icon: <Key        className="w-3.5 h-3.5" />, color: 'text-violet-600  bg-violet-500/10'  },
  BULK_DELETE:    { label: 'Ommaviy o\'chirdi',   icon: <Trash2     className="w-3.5 h-3.5" />, color: 'text-rose-700    bg-rose-500/15'    },
  CHANGE_TARGETS: { label: 'Targetlarni o\'zgartirdi', icon: <Target className="w-3.5 h-3.5" />, color: 'text-indigo-600 bg-indigo-500/10' },
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('uz-UZ', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const [tab, setTab] = useState<'users' | 'security' | 'targets' | 'data'>('users')

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((msg: string, ok = true) => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, msg, ok }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500)
  }, [])

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 1 — FOYDALANUVCHILAR
  // ══════════════════════════════════════════════════════════════════════════
  const [users,        setUsers]        = useState<UserRow[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [selected,     setSelected]     = useState<Set<string>>(new Set())

  // Add form
  const [addTabel,    setAddTabel]    = useState('')
  const [addName,     setAddName]     = useState('')
  const [addPwd,      setAddPwd]      = useState('')
  const [addRole,     setAddRole]     = useState('gca_auditor')
  const [addShift,    setAddShift]    = useState('')
  const [addShop,     setAddShop]     = useState('')
  const [showAddPwd,  setShowAddPwd]  = useState(false)
  const [addLoading,  setAddLoading]  = useState(false)

  // Edit panel (shown below the row)
  const [editId,      setEditId]      = useState<string | null>(null)
  const [editName,    setEditName]    = useState('')
  const [editRole,    setEditRole]    = useState('')
  const [editShift,   setEditShift]   = useState('')
  const [editShop,    setEditShop]    = useState('')
  const [editPwd,     setEditPwd]     = useState('')
  const [showEditPwd, setShowEditPwd] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res  = await fetch('/api/users')
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
    } catch { toast('Foydalanuvchilarni yuklashda xatolik', false) }
    finally   { setLoadingUsers(false) }
  }, [toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const matchRole   = !filterRole || u.role === filterRole
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.tabel_number.toLowerCase().includes(q)
      return matchRole && matchSearch
    })
  }, [users, search, filterRole])

  // Statistika
  const stats = useMemo(() => ({
    total:     users.length,
    admins:    users.filter(u => ['superadmin','admin'].includes(u.role)).length,
    managers:  users.filter(u => u.role === 'manager').length,
    operators: users.filter(u => !['superadmin','admin','manager'].includes(u.role)).length,
    noShift:   users.filter(u => rm(u.role).needsShift  && !u.shift).length,
    noShop:    users.filter(u => rm(u.role).needsShop   && !u.shop).length,
  }), [users])

  const handleAdd = async () => {
    if (!addTabel || !addPwd || !addName) { toast("Barcha maydonlarni to'ldiring", false); return }
    setAddLoading(true)
    try {
      const meta = rm(addRole)
      const res  = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabelNumber: addTabel.toUpperCase(), password: addPwd, name: addName, role: addRole,
          shift: (meta.needsShift && addShift) ? addShift : null,
          shop:  (meta.needsShop  && addShop)  ? addShop  : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Xatolik', false); return }
      toast(`✓ ${addName} qo'shildi`)
      setAddTabel(''); setAddName(''); setAddPwd(''); setAddRole('gca_auditor')
      setAddShift(''); setAddShop(''); setShowAddPanel(false)
      fetchUsers()
    } catch { toast('Tarmoq xatoligi', false) }
    finally { setAddLoading(false) }
  }

  const startEdit = (u: UserRow) => {
    setEditId(u.id); setEditName(u.name); setEditRole(u.role)
    setEditShift(u.shift ?? ''); setEditShop(u.shop ?? ''); setEditPwd('')
    setShowEditPwd(false); setDeleteId(null)
  }

  const cancelEdit = () => { setEditId(null); setEditPwd('') }

  const handleSave = async () => {
    if (!editId || !editName || !editRole) return
    setEditLoading(true)
    try {
      const meta = rm(editRole)
      const res  = await fetch('/api/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId, name: editName, role: editRole,
          password: editPwd || undefined,
          shift: (meta.needsShift && editShift) ? editShift : null,
          shop:  (meta.needsShop  && editShop)  ? editShop  : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Xatolik', false); return }
      toast('✓ Saqlandi')
      cancelEdit(); fetchUsers()
    } catch { toast('Tarmoq xatoligi', false) }
    finally { setEditLoading(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Xatolik', false); return }
      toast("✓ O'chirildi")
      setDeleteId(null); cancelEdit(); fetchUsers()
    } catch { toast('Tarmoq xatoligi', false) }
  }

  // Bulk select
  const allSelected   = filteredUsers.length > 0 && filteredUsers.every(u => selected.has(u.id))
  const toggleAll     = () => setSelected(allSelected ? new Set() : new Set(filteredUsers.map(u => u.id)))
  const toggleOne     = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    setBulkDeleting(true)
    let ok = 0
    for (const id of selected) {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      if (res.ok) ok++
    }
    toast(`✓ ${ok} ta foydalanuvchi o'chirildi`)
    setSelected(new Set()); setBulkDeleting(false); fetchUsers()
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 2 — XAVFSIZLIK
  // ══════════════════════════════════════════════════════════════════════════
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [auditStats,   setAuditStats]   = useState<AuditStats | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFilter,  setAuditFilter]  = useState<'all' | 'fail' | 'login' | 'changes'>('all')

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true)
    try {
      const res  = await fetch('/api/audit?limit=200')
      const data = await res.json()
      if (data.entries) { setAuditEntries(data.entries); setAuditStats(data.stats) }
    } catch { toast('Audit logni yuklashda xatolik', false) }
    finally { setAuditLoading(false) }
  }, [toast])

  useEffect(() => { if (tab === 'security') fetchAudit() }, [tab, fetchAudit])

  const filteredAudit = useMemo(() => {
    switch (auditFilter) {
      case 'fail':    return auditEntries.filter(e => !e.ok)
      case 'login':   return auditEntries.filter(e => e.action === 'LOGIN' || e.action === 'LOGIN_FAIL')
      case 'changes': return auditEntries.filter(e => ['CREATE_USER','EDIT_USER','DELETE_USER','RESET_PASSWORD','BULK_DELETE','CHANGE_TARGETS'].includes(e.action))
      default:        return auditEntries
    }
  }, [auditEntries, auditFilter])

  // Xavfsizlik ogohlantirishlari
  const warnings = useMemo(() => {
    const list: { type: 'warn' | 'crit'; msg: string }[] = []
    if (stats.noShift > 0)  list.push({ type: 'warn', msg: `${stats.noShift} ta inspektor/muhandisda smena belgilanmagan` })
    if (stats.noShop > 0)   list.push({ type: 'warn', msg: `${stats.noShop} ta inspektor/muhandisda sexi belgilanmagan` })
    if (auditStats && auditStats.loginFails > 5)
      list.push({ type: 'crit', msg: `So'nggi ${auditStats.loginFails} ta muvaffaqiyatsiz kirish urinishi aniqlandi` })
    return list
  }, [stats, auditStats])

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 3 — WDPV TARGETLAR
  // ══════════════════════════════════════════════════════════════════════════
  const [targets,      setTargets]      = useState({ ...DEFAULT_TARGETS })
  const [vehicles,     setVehicles]     = useState(50)
  const [targetsSaved, setTargetsSaved] = useState(false)

  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_TARGETS)
      const v = localStorage.getItem(LS_VEHICLES)
      if (t) setTargets(prev => ({ ...prev, ...JSON.parse(t) }))
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
      toast("✓ Targetlar saqlandi va barcha dashboardlarga qo'llanildi")
    } catch { toast('Saqlashda xatolik', false) }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 4 — MA'LUMOTLAR
  // ══════════════════════════════════════════════════════════════════════════
  const [dbStats,       setDbStats]      = useState({ gca: 0, d10: 0, d20: 0, qrecords: 0, incoming: 0 })
  const [dbLoading,     setDbLoading]    = useState(false)
  const [deleteTarget,  setDeleteTarget] = useState<string | null>(null)
  const [deleteInput,   setDeleteInput]  = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchDbStats = useCallback(async () => {
    setDbLoading(true)
    try { const r = await fetch('/api/bulk-delete'); const d = await r.json(); setDbStats(d) }
    catch {}
    finally { setDbLoading(false) }
  }, [])

  useEffect(() => { if (tab === 'data') fetchDbStats() }, [tab, fetchDbStats])

  const handleBulkDeleteDb = async () => {
    if (deleteInput !== 'DELETE') { toast('"DELETE" deb yozing', false); return }
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/bulk-delete?table=${deleteTarget}&confirm=yes`, { method: 'DELETE' })
      const d   = await res.json()
      if (!res.ok) { toast(d.error ?? 'Xatolik', false); return }
      toast(`✓ ${d.deleted} ta yozuv o'chirildi`)
      setDeleteTarget(null); setDeleteInput(''); fetchDbStats()
    } catch { toast('Tarmoq xatoligi', false) }
    finally { setDeleteLoading(false) }
  }

  const TABLE_LABELS: Record<string, string> = {
    gca: 'GCA Yozuvlar', d10: 'D10 Yozuvlar', d20: 'D20 Yozuvlar',
    qrecords: 'QRecords (DRR/DRL/PDI)', incoming: 'Kiruvchi Nazorat',
  }
  const totalDbRecords = Object.values(dbStats).reduce((a, b) => a + b, 0)

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="SuperAdmin Panel"
        description="Foydalanuvchilar, xavfsizlik, targetlar va ma'lumotlarni boshqarish"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'SuperAdmin' }]}
        actions={
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/40 text-yellow-600 text-xs font-bold">
            <Crown className="w-3.5 h-3.5" /> SUPERADMIN
          </span>
        }
      />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium pointer-events-auto transition-all ${
            t.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-400'
                 : 'bg-rose-50    border-rose-200    text-rose-700    dark:bg-rose-500/15    dark:border-rose-500/40    dark:text-rose-400'
          }`}>
            {t.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            {t.msg}
          </div>
        ))}
      </div>

      <div className="p-6 space-y-6">

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border w-fit flex-wrap">
          {([
            { key: 'users',    label: 'Foydalanuvchilar', icon: <Users    className="w-4 h-4" />, badge: stats.noShift + stats.noShop > 0 ? stats.noShift + stats.noShop : null },
            { key: 'security', label: 'Xavfsizlik',        icon: <Shield   className="w-4 h-4" />, badge: warnings.length > 0 ? warnings.length : null },
            { key: 'targets',  label: 'WDPV Targetlar',    icon: <Target   className="w-4 h-4" />, badge: null },
            { key: 'data',     label: "Ma'lumotlar",        icon: <Database className="w-4 h-4" />, badge: null },
          ] as const).map(({ key, label, icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key
                  ? 'bg-card border border-border shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {icon}{label}
              {badge !== null && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: FOYDALANUVCHILAR
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="space-y-5">

            {/* KPI qatorlari */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Jami',       value: stats.total,     color: 'text-blue-600',    bg: 'bg-blue-500/10    border-blue-500/30',    icon: <Users       className="w-4 h-4" /> },
                { label: 'Admin',      value: stats.admins,    color: 'text-yellow-600',  bg: 'bg-yellow-500/10  border-yellow-500/30',  icon: <Crown       className="w-4 h-4" /> },
                { label: 'Rahbar',     value: stats.managers,  color: 'text-purple-600',  bg: 'bg-purple-500/10  border-purple-500/30',  icon: <ShieldCheck className="w-4 h-4" /> },
                { label: 'Operatorlar',value: stats.operators, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: <Activity    className="w-4 h-4" /> },
                { label: 'Smenasiz ⚠', value: stats.noShift,   color: stats.noShift  ? 'text-amber-600'  : 'text-muted-foreground', bg: stats.noShift  ? 'bg-amber-500/10  border-amber-500/30'  : 'bg-muted/20 border-border', icon: <Clock       className="w-4 h-4" /> },
                { label: 'Sehsiz ⚠',  value: stats.noShop,    color: stats.noShop   ? 'text-rose-600'   : 'text-muted-foreground', bg: stats.noShop   ? 'bg-rose-500/10   border-rose-500/30'   : 'bg-muted/20 border-border', icon: <AlertCircle className="w-4 h-4" /> },
              ].map(item => (
                <div key={item.label} className={`bg-card rounded-xl border p-3 ${item.bg}`}>
                  <div className={`${item.color} mb-1`}>{item.icon}</div>
                  <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Boshqaruv paneli */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">

              {/* Sarlavha + tugmalar */}
              <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-border">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Foydalanuvchilar ({filteredUsers.length} / {users.length})
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {selected.size > 0 && (
                    <Button
                      variant="destructive" size="sm"
                      onClick={handleBulkDelete} disabled={bulkDeleting}
                      className="gap-1.5"
                    >
                      {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {selected.size} ta o'chir
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
                    {loadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" onClick={() => { setShowAddPanel(v => !v); setEditId(null) }} className="gap-1.5">
                    {showAddPanel ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {showAddPanel ? 'Bekor' : "Yangi qo'shish"}
                  </Button>
                </div>
              </div>

              {/* Yangi foydalanuvchi paneli */}
              {showAddPanel && (
                <div className="px-5 py-5 bg-primary/5 border-b border-border">
                  <p className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" /> Yangi foydalanuvchi qo'shish
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Tabel */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tabel raqami *</label>
                      <input
                        value={addTabel} onChange={e => setAddTabel(e.target.value.toUpperCase())}
                        placeholder="T014"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    {/* Ism */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To'liq ism *</label>
                      <input
                        value={addName} onChange={e => setAddName(e.target.value)}
                        placeholder="Ism familiya"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    {/* Parol */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parol *</label>
                      <div className="relative">
                        <input
                          value={addPwd} onChange={e => setAddPwd(e.target.value)}
                          type={showAddPwd ? 'text' : 'password'} placeholder="Parol"
                          className="w-full px-3 py-2 pr-9 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button onClick={() => setShowAddPwd(v => !v)} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                          {showAddPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {/* Rol */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol *</label>
                      <select
                        value={addRole} onChange={e => { setAddRole(e.target.value); setAddShift(''); setAddShop('') }}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    {/* Smena (conditional) */}
                    {rm(addRole).needsShift && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Smena *</label>
                        <select
                          value={addShift} onChange={e => setAddShift(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          <option value="">— Tanlang —</option>
                          {SHIFTS.map(s => <option key={s} value={s}>Smena {s}</option>)}
                        </select>
                      </div>
                    )}
                    {/* Sexi (conditional) */}
                    {rm(addRole).needsShop && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sexi *</label>
                        <select
                          value={addShop} onChange={e => setAddShop(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          <option value="">— Tanlang —</option>
                          {ALL_SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    )}
                    {/* Submit */}
                    <div className="flex items-end sm:col-span-2 lg:col-span-1">
                      <Button onClick={handleAdd} disabled={addLoading} className="w-full gap-1.5">
                        {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Qo'shish
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Qidiruv + filter */}
              <div className="px-5 py-3 border-b border-border flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Ism yoki tabel raqami..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                </div>
                <select
                  value={filterRole} onChange={e => setFilterRole(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none"
                >
                  <option value="">Barcha rollar</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Jadval */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="w-10 px-4 py-3">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll}
                          className="rounded border-border cursor-pointer" />
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Tabel #</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Ism</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Rol</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Smena</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Sexi</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">Qo'shilgan</th>
                      <th className="px-4 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {loadingUsers ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground italic">Foydalanuvchi topilmadi</td></tr>
                    ) : filteredUsers.map(u => {
                      const meta      = rm(u.role)
                      const isEditing = editId === u.id
                      const eMeta     = isEditing ? rm(editRole) : null
                      const missingShift = meta.needsShift && !u.shift
                      const missingShop  = meta.needsShop  && !u.shop

                      return (
                        <React.Fragment key={u.id}>
                          {/* Asosiy qator */}
                          <tr className={`transition-colors ${
                            isEditing ? 'bg-primary/5 border-l-2 border-l-primary' :
                            selected.has(u.id) ? 'bg-primary/3' :
                            'hover:bg-muted/20'
                          }`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)}
                                className="rounded border-border cursor-pointer" />
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-primary">{u.tabel_number}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-foreground">{u.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${meta.bg} ${meta.color}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {missingShift ? (
                                <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Belgilanmagan
                                </span>
                              ) : u.shift ? (
                                <span className="text-xs font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded">Smena {u.shift}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {missingShop ? (
                                <span className="flex items-center gap-1 text-xs text-rose-600 font-semibold">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Belgilanmagan
                                </span>
                              ) : u.shop ? (
                                <span className="text-xs font-semibold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded">{u.shop}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString('uz-UZ')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {deleteId === u.id ? (
                                  <>
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)} className="h-7 text-xs px-2">Ha</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(null)} className="h-7 w-7 p-0"><X className="w-3.5 h-3.5" /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant={isEditing ? 'default' : 'ghost'} onClick={() => isEditing ? cancelEdit() : startEdit(u)} className="h-7 w-7 p-0">
                                      {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(u.id)} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Tahrirlash paneli (qator ostida) */}
                          {isEditing && (
                            <tr className="bg-primary/5 border-b border-primary/20">
                              <td colSpan={8} className="px-5 py-4">
                                <div className="flex flex-wrap gap-3 items-end">
                                  <div className="space-y-1 min-w-[140px]">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ism</label>
                                    <input value={editName} onChange={e => setEditName(e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg bg-background border border-primary/40 text-sm text-foreground focus:outline-none" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</label>
                                    <select value={editRole} onChange={e => { setEditRole(e.target.value); setEditShift(''); setEditShop('') }}
                                      className="px-3 py-2 rounded-lg bg-background border border-primary/40 text-sm text-foreground focus:outline-none">
                                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                  </div>
                                  {eMeta?.needsShift && (
                                    <div className="space-y-1">
                                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Smena</label>
                                      <select value={editShift} onChange={e => setEditShift(e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-background border border-primary/40 text-sm text-foreground focus:outline-none">
                                        <option value="">— Tanlang —</option>
                                        {SHIFTS.map(s => <option key={s} value={s}>Smena {s}</option>)}
                                      </select>
                                    </div>
                                  )}
                                  {eMeta?.needsShop && (
                                    <div className="space-y-1">
                                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sexi</label>
                                      <select value={editShop} onChange={e => setEditShop(e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-background border border-primary/40 text-sm text-foreground focus:outline-none">
                                        <option value="">— Tanlang —</option>
                                        {ALL_SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    </div>
                                  )}
                                  <div className="space-y-1 min-w-[160px]">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                      <Key className="w-3 h-3 inline mr-1" />Yangi parol (ixtiyoriy)
                                    </label>
                                    <div className="relative">
                                      <input value={editPwd} onChange={e => setEditPwd(e.target.value)}
                                        type={showEditPwd ? 'text' : 'password'} placeholder="O'zgartirish uchun kiriting"
                                        className="w-full px-3 py-2 pr-8 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none" />
                                      <button onClick={() => setShowEditPwd(v => !v)} className="absolute right-2 top-2.5 text-muted-foreground">
                                        {showEditPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSave} disabled={editLoading} className="gap-1.5 h-9">
                                      {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                      Saqlash
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={cancelEdit} className="h-9">
                                      Bekor
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredUsers.length} ta foydalanuvchi ko'rsatilmoqda</span>
                {selected.size > 0 && <span className="text-primary font-semibold">{selected.size} ta tanlangan</span>}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: XAVFSIZLIK
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'security' && (
          <div className="space-y-5">

            {/* Ogohlantirishlar */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((w, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
                    w.type === 'crit'
                      ? 'bg-rose-500/10   border-rose-500/30   text-rose-700   dark:text-rose-400'
                      : 'bg-amber-500/10  border-amber-500/30  text-amber-700  dark:text-amber-400'
                  }`}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {w.msg}
                  </div>
                ))}
              </div>
            )}

            {/* Statistika kartochkalari */}
            {auditStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Jami amallar', value: auditStats.total,      color: 'text-blue-600',   bg: 'bg-blue-500/10   border-blue-500/30'   },
                  { label: 'Bugun',         value: auditStats.todayCount, color: 'text-emerald-600',bg: 'bg-emerald-500/10 border-emerald-500/30' },
                  { label: 'Muvaffaqiyatsiz', value: auditStats.failCount,color: auditStats.failCount > 0 ? 'text-rose-600' : 'text-muted-foreground', bg: auditStats.failCount > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-muted/20 border-border' },
                  { label: 'Xato kirishlar', value: auditStats.loginFails,color: auditStats.loginFails > 0 ? 'text-amber-600' : 'text-muted-foreground', bg: auditStats.loginFails > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/20 border-border' },
                ].map(item => (
                  <div key={item.label} className={`bg-card rounded-xl border p-4 ${item.bg}`}>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Smena/Sexi belgilanmagan foydalanuvchilar */}
            {(stats.noShift > 0 || stats.noShop > 0) && (
              <div className="bg-card border border-amber-500/30 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    Smena/Sexi belgilanmagan foydalanuvchilar
                  </span>
                </div>
                <div className="divide-y divide-border/60">
                  {users
                    .filter(u => (rm(u.role).needsShift && !u.shift) || (rm(u.role).needsShop && !u.shop))
                    .map(u => (
                      <div key={u.id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-primary">{u.tabel_number}</span>
                          <span className="text-sm text-foreground">{u.name}</span>
                          <span className={`text-xs font-semibold ${rm(u.role).color}`}>{rm(u.role).label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {rm(u.role).needsShift && !u.shift && (
                            <span className="text-xs bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-semibold">
                              Smena yo'q
                            </span>
                          )}
                          {rm(u.role).needsShop && !u.shop && (
                            <span className="text-xs bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded font-semibold">
                              Sexi yo'q
                            </span>
                          )}
                          <Button size="sm" variant="outline" onClick={() => { setTab('users'); startEdit(u) }} className="h-7 text-xs gap-1">
                            <Edit2 className="w-3 h-3" /> Tuzatish
                          </Button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Audit log */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Amallar tarixi (Audit Log)
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter tugmalari */}
                  {(['all','login','changes','fail'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setAuditFilter(f)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        auditFilter === f
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {{ all: 'Barchasi', login: 'Kirishlar', changes: "O'zgarishlar", fail: 'Xatolar' }[f]}
                    </button>
                  ))}
                  <Button variant="outline" size="sm" onClick={fetchAudit} disabled={auditLoading}>
                    {auditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Vaqt</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Foydalanuvchi</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Amal</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Nishon</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tafsilot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {auditLoading ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" /></td></tr>
                    ) : filteredAudit.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">Yozuvlar topilmadi</td></tr>
                    ) : filteredAudit.map(e => {
                      const am = ACTION_META[e.action] ?? { label: e.action, icon: <Activity className="w-3.5 h-3.5" />, color: 'text-muted-foreground bg-muted/20' }
                      return (
                        <tr key={e.id} className={`hover:bg-muted/20 transition-colors ${!e.ok ? 'bg-rose-500/5' : ''}`}>
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtTime(e.ts)}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono font-bold text-primary mr-1.5">{e.actor}</span>
                            <span className="text-muted-foreground">{e.actorName}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${am.color}`}>
                              {am.icon}{am.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-foreground">{e.target ?? '—'}</td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{e.details ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 border-t border-border bg-muted/10 text-xs text-muted-foreground">
                {filteredAudit.length} ta yozuv ko'rsatilmoqda (so'nggi {auditEntries.length} ta)
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: WDPV TARGETLAR
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'targets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-primary/5">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Sehlar bo'yicha WDPV Targetlar
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Avtomobil boshiga nuqson soni chegaralari</p>
              </div>
              <div className="divide-y divide-border/60">
                {SHOPS_GCA.map(shop => (
                  <div key={shop} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{shop}</p>
                      <p className="text-xs text-muted-foreground">
                        Standart: {DEFAULT_TARGETS[shop]}
                        {targets[shop] !== DEFAULT_TARGETS[shop] && <span className="ml-2 text-primary font-medium">→ O'zgartirilgan</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Target:</span>
                      <input
                        type="number" min={0.01} max={10} step={0.01}
                        value={targets[shop] ?? DEFAULT_TARGETS[shop]}
                        onChange={e => setTargets(t => ({ ...t, [shop]: parseFloat(e.target.value) || DEFAULT_TARGETS[shop] }))}
                        className="w-20 px-2.5 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-primary/5">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Zavod jami va Avtomobillar
                  </h2>
                </div>
                <div className="px-5 py-5 space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-2">PLANT WDPV Target</label>
                    <input
                      type="number" min={0.1} max={20} step={0.1}
                      value={targets['PLANT'] ?? DEFAULT_TARGETS['PLANT']}
                      onChange={e => setTargets(t => ({ ...t, 'PLANT': parseFloat(e.target.value) || DEFAULT_TARGETS['PLANT'] }))}
                      className="w-28 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-2">Smena avtomobillari soni</label>
                    <input
                      type="number" min={1} max={500} step={1} value={vehicles}
                      onChange={e => setVehicles(parseInt(e.target.value) || 50)}
                      className="w-28 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground mb-3">Status chegaralari</p>
                <div className="space-y-2">
                  {SHOPS_GCA.map(shop => {
                    const t = targets[shop] ?? DEFAULT_TARGETS[shop]
                    return (
                      <div key={shop} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-24 flex-shrink-0">{shop}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">≤{t.toFixed(2)} OK</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15  text-amber-600  border border-amber-500/30" >≤{(t*1.5).toFixed(2)} ⚠</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15   text-rose-600   border border-rose-500/30"  >&gt;{(t*1.5).toFixed(2)} ❌</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={saveTargets} className="gap-2 flex-1">
                  {targetsSaved ? <><CheckCircle className="w-4 h-4" />Saqlandi!</> : <><Save className="w-4 h-4" />Saqlash</>}
                </Button>
                <Button onClick={() => { setTargets({ ...DEFAULT_TARGETS }); setVehicles(50); toast('Standart qiymatlarga qaytarildi') }} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Reset
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: MA'LUMOTLAR
        ══════════════════════════════════════════════════════════════════ */}
        {tab === 'data' && (
          <div className="space-y-5">

            {/* Statistika */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> Jadvallar statistikasi
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Jami: {totalDbRecords} yozuv
                  </span>
                </h2>
                <Button variant="outline" size="sm" onClick={fetchDbStats} disabled={dbLoading}>
                  {dbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-border/60">
                {([
                  { key: 'gca',      label: 'GCA',      color: 'text-blue-600',   bg: 'bg-blue-500/5'   },
                  { key: 'd10',      label: 'D10',      color: 'text-indigo-600', bg: 'bg-indigo-500/5' },
                  { key: 'd20',      label: 'D20',      color: 'text-violet-600', bg: 'bg-violet-500/5' },
                  { key: 'qrecords', label: 'QRecords', color: 'text-amber-600',  bg: 'bg-amber-500/5'  },
                  { key: 'incoming', label: 'Incoming', color: 'text-cyan-600',   bg: 'bg-cyan-500/5'   },
                ] as const).map(item => (
                  <div key={item.key} className={`px-5 py-5 ${item.bg}`}>
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className={`text-3xl font-bold ${item.color}`}>{dbLoading ? '–' : dbStats[item.key]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">yozuv</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ommaviy o'chirish */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-rose-500/5">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-500" /> Ommaviy o'chirish
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Barcha yozuvlar o'chiriladi — bu amalni qaytarib bo'lmaydi!</p>
              </div>
              <div className="divide-y divide-border/60">
                {(['gca','d10','d20','qrecords','incoming'] as const).map(key => (
                  <div key={key} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{TABLE_LABELS[key]}</p>
                      <p className="text-xs text-muted-foreground">{dbStats[key]} ta yozuv mavjud</p>
                    </div>
                    {deleteTarget === key ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                          placeholder="DELETE yozing"
                          className="px-3 py-1.5 rounded-lg bg-background border border-rose-500/40 text-sm text-foreground focus:outline-none w-32"
                        />
                        <Button size="sm" variant="destructive" onClick={handleBulkDeleteDb}
                          disabled={deleteLoading || deleteInput !== 'DELETE'} className="gap-1">
                          {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          O'chir
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteInput('') }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline"
                        onClick={() => { setDeleteTarget(key); setDeleteInput('') }}
                        disabled={dbStats[key] === 0}
                        className="gap-1.5 text-rose-500 border-rose-500/40 hover:bg-rose-500/10">
                        <Trash2 className="w-3.5 h-3.5" /> Barchasini o'chir
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-rose-500/5 text-xs text-rose-600 dark:text-rose-400">
                ⚠ Tasdiqlash uchun "DELETE" deb yozing — bu amalni bekor qilib bo'lmaydi.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

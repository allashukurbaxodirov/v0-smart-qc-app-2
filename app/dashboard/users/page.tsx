'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, Edit2, Trash2, X, Check, Lock, Shield } from 'lucide-react'

// ─── Konstantlar ──────────────────────────────────────────────────────────────
const SHOPS = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA'] as const
const SHIFTS = ['A', 'B', 'D'] as const

const ROLES = [
  { value: 'superadmin',         label: 'Super Admin',         needsShift: false, needsShop: false },
  { value: 'admin',              label: 'Admin',               needsShift: false, needsShop: false },
  { value: 'manager',            label: 'Rahbar (Manager)',    needsShift: false, needsShop: false },
  { value: 'gca_auditor',        label: 'GCA Auditor',         needsShift: false, needsShop: true  },
  { value: 'cmm_inspector',      label: 'CMM Inspector',       needsShift: false, needsShop: true  },
  { value: 'd10_inspector',      label: 'D10 Inspector',       needsShift: false, needsShop: true  },
  { value: 'd20_inspector',      label: 'D20 Inspector',       needsShift: false, needsShop: true  },
  { value: 'drr_inspector',      label: 'DRR Inspector',       needsShift: true,  needsShop: true  },
  { value: 'drl_inspector',      label: 'DRL Inspector',       needsShift: true,  needsShop: true  },
  { value: 'pdi_inspector',      label: 'PDI Inspector',       needsShift: true,  needsShop: true  },
  { value: 'incoming_inspector', label: 'Incoming Inspector',  needsShift: true,  needsShop: false },
  { value: 'ga_engineer',        label: 'GA Engineer',         needsShift: false, needsShop: true  },
  { value: 'welding_engineer',   label: 'Welding Engineer',    needsShift: false, needsShop: true  },
]

const ROLE_COLORS: Record<string, string> = {
  superadmin:         'bg-rose-500/15 text-rose-600 border-rose-500/40',
  admin:              'bg-orange-500/15 text-orange-600 border-orange-500/40',
  manager:            'bg-blue-500/15 text-blue-600 border-blue-500/40',
  gca_auditor:        'bg-emerald-500/15 text-emerald-600 border-emerald-500/40',
  cmm_inspector:      'bg-violet-500/15 text-violet-600 border-violet-500/40',
  d10_inspector:      'bg-purple-500/15 text-purple-600 border-purple-500/40',
  d20_inspector:      'bg-indigo-500/15 text-indigo-600 border-indigo-500/40',
  drr_inspector:      'bg-amber-500/15 text-amber-600 border-amber-500/40',
  drl_inspector:      'bg-yellow-500/15 text-yellow-600 border-yellow-500/40',
  pdi_inspector:      'bg-cyan-500/15 text-cyan-600 border-cyan-500/40',
  incoming_inspector: 'bg-teal-500/15 text-teal-600 border-teal-500/40',
  ga_engineer:        'bg-lime-500/15 text-lime-600 border-lime-500/40',
  welding_engineer:   'bg-sky-500/15 text-sky-600 border-sky-500/40',
}

interface User {
  id: string
  tabelNumber: string
  email: string | null
  name: string
  role: string
  shift: string | null
  shop: string | null
  created_at: string
}

const emptyForm = {
  tabelNumber: '',
  password: '',
  name: '',
  role: 'drr_inspector',
  shift: '',
  shop: '',
}

export default function UsersPage() {
  const [users,     setUsers]     = useState<User[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser,  setEditUser]  = useState<User | null>(null)
  const [form,      setForm]      = useState(emptyForm)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  const selectedRole = ROLES.find(r => r.value === form.role)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditUser(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({
      tabelNumber: u.tabelNumber,
      password:    '',
      name:        u.name,
      role:        u.role,
      shift:       u.shift ?? '',
      shop:        u.shop  ?? '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    setError('')
    if (!form.name.trim() || !form.role) {
      setError("Ism va rol to'ldirilishi shart")
      return
    }
    if (!editUser && (!form.tabelNumber.trim() || !form.password.trim())) {
      setError("Tabel raqami va parol to'ldirilishi shart")
      return
    }
    if (selectedRole?.needsShift && !form.shift) {
      setError("Bu rol uchun smena tanlanishi shart")
      return
    }
    if (selectedRole?.needsShop && !form.shop) {
      setError("Bu rol uchun seh tanlanishi shart")
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, string> = {
        name:  form.name.trim(),
        role:  form.role,
        shift: form.shift || '',
        shop:  form.shop  || '',
      }

      let res: Response
      if (editUser) {
        if (form.password.trim()) payload.password = form.password.trim()
        res = await fetch('/api/users', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ id: editUser.id, ...payload }),
        })
      } else {
        payload.tabelNumber = form.tabelNumber.trim().toUpperCase()
        payload.password    = form.password.trim()
        res = await fetch('/api/users', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Xatolik'); return }

      setSuccess(editUser ? 'Foydalanuvchi yangilandi' : 'Yangi foydalanuvchi qo\'shildi')
      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      loadUsers()
    } catch {
      setError('Tarmoq xatosi')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`"${u.name}" (${u.tabelNumber}) o'chirilsinmi?`)) return
    try {
      await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' })
      loadUsers()
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Foydalanuvchilar"
        description="Tizim foydalanuvchilarini boshqarish — smena va seh tayinlash"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Foydalanuvchilar' },
        ]}
        actions={
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <UserPlus className="w-4 h-4" />
            Yangi foydalanuvchi
          </Button>
        }
      />

      <div className="p-6 space-y-5">

        {/* Success */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600">{success}</p>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Faol foydalanuvchilar</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{users.length} ta foydalanuvchi</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Tabel</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ism</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Rol</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Smena</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Seh</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Yuklanmoqda...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Foydalanuvchilar yo'q</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{u.tabelNumber}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{u.name}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${ROLE_COLORS[u.role] ?? 'bg-muted text-foreground border-border'}`}>
                        {ROLES.find(r => r.value === u.role)?.label ?? u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.shift ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                          <Lock className="w-3 h-3" /> Smena {u.shift}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.shop ? (
                        <span className="text-xs font-semibold text-foreground">{u.shop}</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => handleDelete(u)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roller haqida */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Smena va seh tayinlash qoidalari</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="font-semibold text-foreground mb-1">Smena + Seh kerak</p>
              <p className="text-muted-foreground text-xs">DRR, DRL, PDI, Incoming — smena va seh tayinlanmasa nuqson kira olmaydi</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="font-semibold text-foreground mb-1">Faqat Seh kerak</p>
              <p className="text-muted-foreground text-xs">GCA, CMM, D10, D20, GA Engineer, Welding Engineer — seh tayinlanmasa nuqson kira olmaydi</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-4">
              <p className="font-semibold text-foreground mb-1">Erkin kirish</p>
              <p className="text-muted-foreground text-xs">Superadmin, Admin, Manager — smena va seh cheklovsiz</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                {editUser ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-600 font-medium">
                  {error}
                </div>
              )}

              {/* Tabel raqami — faqat yaratishda */}
              {!editUser && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Tabel raqami *</label>
                  <Input
                    placeholder="Masalan: T015"
                    value={form.tabelNumber}
                    onChange={e => setForm(p => ({ ...p, tabelNumber: e.target.value.toUpperCase() }))}
                    className="font-mono tracking-widest uppercase"
                  />
                </div>
              )}

              {/* Ism */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Ism *</label>
                <Input
                  placeholder="To'liq ism"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              {/* Parol */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">
                  Parol {editUser ? '(o\'zgartirmasangiz bo\'sh qoldiring)' : '*'}
                </label>
                <Input
                  type="password"
                  placeholder={editUser ? 'Yangi parol (ixtiyoriy)' : 'Parol kiriting'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
              </div>

              {/* Rol */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Rol *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value, shift: '', shop: '' }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Smena — faqat kerakli rollar uchun */}
              {selectedRole?.needsShift && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Tayinlangan smena *
                  </label>
                  <select
                    value={form.shift}
                    onChange={e => setForm(p => ({ ...p, shift: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">— Smena tanlang —</option>
                    {SHIFTS.map(s => (
                      <option key={s} value={s}>Smena {s}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Nazoratchi faqat shu smenada nuqson kirita oladi
                  </p>
                </div>
              )}

              {/* Seh — faqat kerakli rollar uchun */}
              {selectedRole?.needsShop && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Tayinlangan seh *
                  </label>
                  <select
                    value={form.shop}
                    onChange={e => setForm(p => ({ ...p, shop: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">— Seh tanlang —</option>
                    {SHOPS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Nazoratchi faqat shu sehda nuqson kirita oladi
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                Bekor qilish
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saqlanmoqda...' : editUser ? 'Saqlash' : "Qo'shish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

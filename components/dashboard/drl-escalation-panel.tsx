'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle2, Clock, ChevronDown, ChevronUp, RefreshCw, AlertTriangle } from 'lucide-react'

interface Escalation {
  id:            string
  import_batch:  string
  fault_code:    string
  fault_name:    string
  shop:          string
  prod_team:     string
  total_count:   number
  drl_ratio:     number
  model_damas:   number
  model_labo:    number
  assigned_role: string
  assigned_name: string
  priority:      string
  status:        string
  engineer_note: string | null
  root_cause:    string | null
  action_taken:  string | null
  created_at:    string
  resolved_at:   string | null
}

interface ResponseForm {
  id:          string
  engineerNote: string
  rootCause:   string
  actionTaken: string
  status:      string
}

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: '🔴 Kritik',
  high:     '🟠 Yuqori',
  medium:   '🟡 O\'rtacha',
  low:      '🔵 Past',
}

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-red-500/20 text-red-300 border-red-500/30',
  in_progress: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  resolved:    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cancelled:   'bg-muted/20 text-muted-foreground border-border',
}

const STATUS_LABEL: Record<string, string> = {
  open:        '🔴 Ochiq',
  in_progress: '🟡 Jarayonda',
  resolved:    '✅ Yopildi',
  cancelled:   '⛔ Bekor',
}

interface Props {
  role: string  // 'ga_engineer' | 'welding_engineer'
}

export default function DrlEscalationPanel({ role }: Props) {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading,     setLoading]     = useState(true)
  const [collapsed,   setCollapsed]   = useState(false)
  const [form,        setForm]        = useState<ResponseForm | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [savedId,     setSavedId]     = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/drl-escalations?role=${role}`)
      if (res.ok) setEscalations(await res.json())
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => { load() }, [load])

  const openForm = (esc: Escalation) => {
    setForm({
      id:           esc.id,
      engineerNote: esc.engineer_note ?? '',
      rootCause:    esc.root_cause    ?? '',
      actionTaken:  esc.action_taken  ?? '',
      status:       esc.status === 'open' ? 'in_progress' : esc.status,
    })
  }

  const submitForm = async () => {
    if (!form) return
    setSaving(true)
    try {
      await fetch('/api/drl-escalations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:           form.id,
          status:       form.status,
          engineerNote: form.engineerNote,
          rootCause:    form.rootCause,
          actionTaken:  form.actionTaken,
        }),
      })
      setSavedId(form.id)
      setTimeout(() => setSavedId(''), 3000)
      setForm(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const openCount = escalations.filter(e => e.status === 'open').length
  const inProgCount = escalations.filter(e => e.status === 'in_progress').length

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">DRL eskalatsiyalar yuklanmoqda...</span>
      </div>
    )
  }

  if (escalations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-success" />
        <p className="text-sm text-muted-foreground">DRL eskalatsiyalar yo&apos;q</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-red-500/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 bg-red-500/5 border-b border-red-500/20 cursor-pointer"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Bell className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">DRL Eskalatsiyalar</h3>
            <p className="text-xs text-muted-foreground">
              GSIP dan yuborilgan nuqsonlar
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {openCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                {openCount} yangi
              </span>
            )}
            {inProgCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs font-bold">
                {inProgCount} jarayonda
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); load() }}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronUp className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </div>

      {!collapsed && (
        <div className="divide-y divide-border">
          {escalations.map(esc => (
            <div key={esc.id}
              className={`p-5 transition-colors ${
                esc.status === 'open' ? 'bg-red-500/5' : ''
              } ${savedId === esc.id ? 'bg-success/5' : ''}`}
            >
              {/* Row header */}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {esc.fault_code !== '—' && (
                      <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {esc.fault_code}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-foreground">{esc.fault_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${PRIORITY_STYLE[esc.priority] ?? ''}`}>
                      {PRIORITY_LABEL[esc.priority] ?? esc.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_STYLE[esc.status] ?? ''}`}>
                      {STATUS_LABEL[esc.status] ?? esc.status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Jami: <strong className="text-foreground">{esc.total_count} ta</strong></span>
                    <span>Sexi: <strong className="text-foreground">{esc.shop}</strong></span>
                    <span>DAMAS: <strong className="text-blue-300">{esc.model_damas}</strong></span>
                    <span>LABO: <strong className="text-green-300">{esc.model_labo}</strong></span>
                    <span className="text-muted-foreground">
                      {new Date(esc.created_at).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>

                  {/* Engineer response (if exists) */}
                  {(esc.root_cause || esc.action_taken) && (
                    <div className="mt-2 bg-muted/30 rounded-lg p-3 text-xs space-y-1">
                      {esc.root_cause   && <p><span className="text-muted-foreground">Sabab:</span> {esc.root_cause}</p>}
                      {esc.action_taken && <p><span className="text-muted-foreground">Chora:</span> {esc.action_taken}</p>}
                    </div>
                  )}
                </div>

                {/* Action button */}
                {esc.status !== 'resolved' && esc.status !== 'cancelled' && (
                  <button
                    onClick={() => openForm(esc)}
                    className="flex-shrink-0 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    {esc.status === 'open' ? 'Ko\'rish' : 'Yangilash'}
                  </button>
                )}
                {esc.status === 'resolved' && (
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                )}
              </div>

              {/* Inline form */}
              {form?.id === esc.id && (
                <div className="mt-4 bg-muted/20 rounded-xl p-4 space-y-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Injener javobi
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Izoh</label>
                    <textarea
                      value={form.engineerNote}
                      onChange={e => setForm(f => f ? { ...f, engineerNote: e.target.value } : null)}
                      placeholder="Nuqson haqida fikr..."
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Ildiz sabab</label>
                      <textarea
                        value={form.rootCause}
                        onChange={e => setForm(f => f ? { ...f, rootCause: e.target.value } : null)}
                        placeholder="Sabab nima..."
                        rows={2}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Ko&apos;rilgan chora</label>
                      <textarea
                        value={form.actionTaken}
                        onChange={e => setForm(f => f ? { ...f, actionTaken: e.target.value } : null)}
                        placeholder="Nima qilindi..."
                        rows={2}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Holat yangilash</label>
                    <div className="flex gap-2">
                      {[
                        { key: 'in_progress', label: '🟡 Jarayonda' },
                        { key: 'resolved',    label: '✅ Yopildi'   },
                      ].map(s => (
                        <button key={s.key} type="button"
                          onClick={() => setForm(f => f ? { ...f, status: s.key } : null)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                            form.status === s.key
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border text-foreground hover:border-primary/50'
                          }`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setForm(null)}
                      className="flex-1 py-2 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
                      Bekor
                    </button>
                    <button onClick={submitForm} disabled={saving}
                      className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all">
                      {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

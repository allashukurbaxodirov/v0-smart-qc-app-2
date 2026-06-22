'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import {
  AlertTriangle, CheckCircle2, Clock, ArrowRightLeft,
  RefreshCw, Loader2, Bell, Send, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ─── Tiplar ─────────────────────────────────────────────────────────────────
interface Escalation {
  id: string
  source: string
  fault_code: string
  fault_name: string
  shop: string
  prod_team: string | null
  total_count: number
  total_weight: number
  model_damas: number
  model_labo: number
  assigned_role: string
  priority: string
  status: string
  engineer_note: string | null
  root_cause: string | null
  action_taken: string | null
  transfer_to: string | null
  transfer_reason: string | null
  created_at: string
  resolved_at: string | null
  due_date: string | null
  created_by_name: string | null
}

interface ActionForm {
  id: string
  engineerNote: string
  rootCause: string
  actionTaken: string
  status: 'in_progress' | 'resolved'
  transferTo: string
  transferReason: string
  mode: 'resolve' | 'transfer'
}

// ─── Konstantalar ───────────────────────────────────────────────────────────
export const TRANSFER_TARGETS = [
  { value: 'WELDING-1',  label: 'Welding-1'   },
  { value: 'WELDING-2',  label: 'Welding-2'   },
  { value: 'PRESS SHOP', label: 'Press Shop'  },
  { value: 'PAINT SHOP', label: 'Paint Shop'  },
  { value: 'GA',         label: 'GA'          },
  { value: 'SQE',        label: 'SQE'         },
  { value: 'QE',         label: 'QE'          },
  { value: 'PE',         label: 'PE'          },
]

const SOURCE_LABEL: Record<string, string> = {
  drr: 'DRR',
  gca: 'GCA',
  drl: 'DRL',
}

const SOURCE_CLS: Record<string, string> = {
  drr: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  gca: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  drl: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

const PRIO_CLS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
}

const PRIO_LABEL: Record<string, string> = {
  critical: '🔴 Kritik',
  high:     '🟠 Yuqori',
  medium:   '🟡 O\'rtacha',
  low:      '🔵 Past',
}

const STATUS_CLS: Record<string, string> = {
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

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  role: string                // 'ga_engineer' | 'welding_engineer' | 'press_engineer' | ...
  roleLabel: string           // 'GA Muhandis'
  shopFilter?: string[]       // Ko'rsatiladigan sehlar (opsional)
  description?: string
}

// ─── KPI kartochka ───────────────────────────────────────────────────────────
function KpiCard({ label, value, cls, border }: { label: string; value: number; cls: string; border: string }) {
  return (
    <div className={`bg-card border-2 ${border} rounded-xl p-4`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  )
}

// ─── Asosiy komponent ────────────────────────────────────────────────────────
export default function EngineerEscalationPage({ role, roleLabel, shopFilter, description }: Props) {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [form, setForm]               = useState<ActionForm | null>(null)
  const [saving, setSaving]           = useState(false)
  const [savedId, setSavedId]         = useState('')
  const [successMsg, setSuccessMsg]   = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/escalations?role=${role}`)
      if (res.ok) setEscalations(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [role])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(() => load(true), 60_000)
    return () => clearInterval(id)
  }, [load])

  // ── Filtrlanganlar ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...escalations]
    if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter)
    if (sourceFilter !== 'all') list = list.filter(e => e.source === sourceFilter)
    if (shopFilter?.length)     list = list.filter(e => shopFilter.includes(e.shop))
    return list
  }, [escalations, statusFilter, sourceFilter, shopFilter])

  // ── KPIlar ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    escalations.length,
    open:     escalations.filter(e => e.status === 'open').length,
    inProg:   escalations.filter(e => e.status === 'in_progress').length,
    resolved: escalations.filter(e => e.status === 'resolved').length,
    critical: escalations.filter(e => e.priority === 'critical' && e.status !== 'resolved').length,
  }), [escalations])

  // ── Form ochish ──────────────────────────────────────────────────────────
  const openForm = (esc: Escalation) => {
    setForm({
      id:            esc.id,
      engineerNote:  esc.engineer_note ?? '',
      rootCause:     esc.root_cause    ?? '',
      actionTaken:   esc.action_taken  ?? '',
      status:        esc.status === 'open' ? 'in_progress' : esc.status as any,
      transferTo:    '',
      transferReason:'',
      mode:          'resolve',
    })
  }

  // ── Saqlash ──────────────────────────────────────────────────────────────
  const submitForm = async () => {
    if (!form) return
    setSaving(true)
    try {
      await fetch('/api/escalations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:             form.id,
          status:         form.mode === 'transfer' ? 'resolved' : form.status,
          engineerNote:   form.engineerNote  || undefined,
          rootCause:      form.rootCause     || undefined,
          actionTaken:    form.actionTaken   || undefined,
          transferTo:     form.mode === 'transfer' ? form.transferTo    : undefined,
          transferReason: form.mode === 'transfer' ? form.transferReason: undefined,
        }),
      })
      setSavedId(form.id)
      setSuccessMsg(
        form.mode === 'transfer'
          ? `Eskalatsiya ${form.transferTo} ga uzatildi ✓`
          : 'Eskalatsiya yangilandi ✓'
      )
      setTimeout(() => { setSavedId(''); setSuccessMsg('') }, 4000)
      setForm(null)
      load(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={`${roleLabel} paneli`}
        description={description ?? `DRR va GCA dan avtomatik eskalatsiya qilingan nuqsonlar`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: `${roleLabel} paneli` },
        ]}
      />

      <div className="p-6 space-y-6">

        {/* Muvaffaqiyat xabari */}
        {successMsg && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <p className="text-sm font-medium text-success">{successMsg}</p>
          </div>
        )}

        {/* KPI kartochkalar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard label="Jami eskalatsiya" value={stats.total}    cls="text-foreground" border="border-border"         />
          <KpiCard label="Ochiq"             value={stats.open}    cls="text-red-400"    border="border-red-500/30"     />
          <KpiCard label="Jarayonda"         value={stats.inProg}  cls="text-amber-400"  border="border-amber-500/30"   />
          <KpiCard label="Hal qilindi"       value={stats.resolved}cls="text-emerald-400"border="border-emerald-500/30" />
          <KpiCard label="Kritik (ochiq)"    value={stats.critical}cls="text-red-400"    border="border-red-500/50"     />
        </div>

        {/* Filtr qatori */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(['all','open','in_progress','resolved'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {s === 'all' ? 'Barchasi' : STATUS_LABEL[s]}
                {s === 'open' && stats.open > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full px-1 text-[10px]">{stats.open}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {(['all','drr','gca','drl'] as const).map(s => (
              <button key={s} onClick={() => setSourceFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  sourceFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {s === 'all' ? 'Barcha manba' : SOURCE_LABEL[s]}
              </button>
            ))}
          </div>

          <button onClick={() => load(true)} disabled={refreshing}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>

        {/* Jadval */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Yuklanmoqda...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 opacity-40" />
              <p className="text-sm text-muted-foreground">Eskalatsiyalar topilmadi</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((esc) => (
                <div key={esc.id}
                  className={`transition-colors ${
                    esc.status === 'open' ? 'bg-red-500/5' : ''
                  } ${savedId === esc.id ? 'bg-success/5' : ''}`}
                >
                  {/* Qator */}
                  <div className="flex items-start gap-3 p-5">
                    <div className="flex-1 min-w-0">
                      {/* Sarlavha */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded border font-mono font-medium ${SOURCE_CLS[esc.source] ?? ''}`}>
                          {SOURCE_LABEL[esc.source] ?? esc.source}
                        </span>
                        {esc.fault_code !== '—' && (
                          <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {esc.fault_code}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-foreground">{esc.fault_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${PRIO_CLS[esc.priority] ?? ''}`}>
                          {PRIO_LABEL[esc.priority] ?? esc.priority}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_CLS[esc.status] ?? ''}`}>
                          {STATUS_LABEL[esc.status] ?? esc.status}
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Seh: <strong className="text-foreground">{esc.shop}</strong></span>
                        <span>Jami: <strong className="text-foreground">{esc.total_count} ta</strong></span>
                        {esc.total_weight > 0 && (
                          <span>Og&apos;irlik: <strong className="text-foreground">{esc.total_weight}</strong></span>
                        )}
                        {esc.model_damas > 0 && <span>DAMAS: <strong className="text-sky-400">{esc.model_damas}</strong></span>}
                        {esc.model_labo  > 0 && <span>LABO: <strong className="text-emerald-400">{esc.model_labo}</strong></span>}
                        <span className="text-muted-foreground/70">
                          {new Date(esc.created_at).toLocaleDateString('uz-UZ')}
                        </span>
                        {esc.transfer_to && (
                          <span className="text-amber-400">→ {esc.transfer_to} ga uzatilgan</span>
                        )}
                      </div>

                      {/* Muhandis javobi (agar bor bo'lsa) */}
                      {(esc.root_cause || esc.action_taken) && (
                        <div className="mt-2 bg-muted/30 rounded-lg p-3 text-xs space-y-1">
                          {esc.root_cause   && <p><span className="text-muted-foreground">Sabab: </span>{esc.root_cause}</p>}
                          {esc.action_taken && <p><span className="text-muted-foreground">Chora: </span>{esc.action_taken}</p>}
                        </div>
                      )}
                    </div>

                    {/* Tugmalar */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {esc.status !== 'resolved' && esc.status !== 'cancelled' && (
                        <button onClick={() => openForm(esc)}
                          className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all">
                          {esc.status === 'open' ? 'Ko\'rish' : 'Yangilash'}
                        </button>
                      )}
                      {esc.status === 'resolved' && (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      )}
                      <button onClick={() => setExpandedId(expandedId === esc.id ? null : esc.id)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        {expandedId === esc.id
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {/* Kengaytirilgan ma'lumot */}
                  {expandedId === esc.id && (
                    <div className="px-5 pb-4 bg-muted/10 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                      {esc.engineer_note && <p><span className="font-medium">Izoh:</span> {esc.engineer_note}</p>}
                      {esc.transfer_reason && <p><span className="font-medium">Uzatish sababi:</span> {esc.transfer_reason}</p>}
                      {esc.resolved_at && <p><span className="font-medium">Yopilgan:</span> {new Date(esc.resolved_at).toLocaleString('uz-UZ')}</p>}
                      {esc.due_date && <p><span className="font-medium">Muddat:</span> {esc.due_date}</p>}
                      {esc.created_by_name && <p><span className="font-medium">Kiritgan:</span> {esc.created_by_name}</p>}
                    </div>
                  )}

                  {/* Inline forma */}
                  {form?.id === esc.id && (
                    <div className="mx-5 mb-5 bg-muted/20 rounded-xl p-5 space-y-4 border border-border">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Muhandis javobi
                        </p>
                        <button onClick={() => setForm(null)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Rejim tanlash */}
                      <div className="flex gap-2">
                        {(['resolve', 'transfer'] as const).map(m => (
                          <button key={m} onClick={() => setForm(f => f ? { ...f, mode: m } : null)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                              form.mode === m
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border text-muted-foreground hover:text-foreground'
                            }`}>
                            {m === 'resolve'
                              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Bartaraf etish</>
                              : <><ArrowRightLeft className="w-3.5 h-3.5" /> Boshqa sehga uzatish</>
                            }
                          </button>
                        ))}
                      </div>

                      {form.mode === 'resolve' ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Muhandis izohi</label>
                            <textarea value={form.engineerNote}
                              onChange={e => setForm(f => f ? { ...f, engineerNote: e.target.value } : null)}
                              placeholder="Nuqson haqida fikr..."
                              rows={2}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:border-primary focus:outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Ildiz sabab *</label>
                              <textarea value={form.rootCause}
                                onChange={e => setForm(f => f ? { ...f, rootCause: e.target.value } : null)}
                                placeholder="Sabab nima..."
                                rows={3}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:border-primary focus:outline-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Ko&apos;rilgan chora *</label>
                              <textarea value={form.actionTaken}
                                onChange={e => setForm(f => f ? { ...f, actionTaken: e.target.value } : null)}
                                placeholder="Nima qilindi..."
                                rows={3}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:border-primary focus:outline-none" />
                            </div>
                          </div>
                          {/* Holat */}
                          <div className="flex gap-2">
                            {([
                              { key: 'in_progress', label: '🟡 Jarayonda' },
                              { key: 'resolved',    label: '✅ Bartaraf etildi' },
                            ] as const).map(s => (
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
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Qaysi sehga uzatish *</label>
                            <select value={form.transferTo}
                              onChange={e => setForm(f => f ? { ...f, transferTo: e.target.value } : null)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:border-primary focus:outline-none">
                              <option value="">Seh tanlang...</option>
                              {TRANSFER_TARGETS
                                .filter(t => t.value !== esc.shop)
                                .map(t => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Uzatish sababi *</label>
                            <textarea value={form.transferReason}
                              onChange={e => setForm(f => f ? { ...f, transferReason: e.target.value } : null)}
                              placeholder="Nima uchun boshqa sehga uzatilyapti..."
                              rows={3}
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:border-primary focus:outline-none" />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setForm(null)}
                          className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
                          Bekor
                        </button>
                        <button onClick={submitForm} disabled={saving ||
                          (form.mode === 'transfer' && (!form.transferTo || !form.transferReason))}
                          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                          {saving
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saqlanmoqda...</>
                            : <><Send className="w-3.5 h-3.5" /> Saqlash</>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ochiq eskalatsiya ogohlantiruvi */}
        {stats.open > 0 && !loading && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <Bell className="w-5 h-5 text-red-400 animate-pulse flex-shrink-0" />
            <p className="text-sm text-red-300">
              <strong>{stats.open}</strong> ta ochiq eskalatsiya hal qilinishini kutmoqda
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
export type QRecordType = 'drr' | 'drl' | 'pdi' | 'gca'
export type QShift = 'A' | 'B' | 'D'

export interface QRecord {
  id: string
  type: QRecordType
  date: string
  shift: QShift
  shop: string
  sector: string | null
  pono?: string | null           // Partiya Orderining Nomeri
  code: string
  codeName: string
  factor: number
  count: number
  notes: string | null
  imageUrl: string | null
  createdByName: string | null
  // Corrective action (filled by engineer)
  cause: string | null
  action: string | null
  brakePoint: string | null
  photoAfter: string | null
  isResolved: boolean
  resolvedByName: string | null
  resolvedAt: string | null
}

export interface CorrectiveAction {
  cause: string
  action: string
  brakePoint: string
  photoAfter: string | null
  resolvedByName: string
}

interface QRecordsCtx {
  records: QRecord[]
  loading: boolean
  error: string | null
  addRecord: (r: Omit<QRecord, 'id' | 'cause' | 'action' | 'brakePoint' | 'photoAfter' | 'isResolved' | 'resolvedByName' | 'resolvedAt'>) => Promise<void>
  updateSector: (id: string, sector: string) => Promise<void>
  updateCorrectiveAction: (id: string, data: CorrectiveAction) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<QRecordsCtx | null>(null)
const LS_KEY     = 'qrecords_local_v1'
const LS_ACT_KEY = 'qrecords_actions_v1'  // corrective actions store

// ─── Load saved actions ────────────────────────────────────────────────────────
function loadActions(): Record<string, Partial<QRecord>> {
  try {
    const raw = localStorage.getItem(LS_ACT_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
function saveActions(map: Record<string, Partial<QRecord>>) {
  try { localStorage.setItem(LS_ACT_KEY, JSON.stringify(map)) } catch {}
}

// ─── Merge record with saved action ───────────────────────────────────────────
function mergeAction(r: QRecord, actMap: Record<string, Partial<QRecord>>): QRecord {
  const act = actMap[r.id]
  if (!act) return r
  return { ...r, ...act }
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function QRecordsProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<QRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    const actMap = loadActions()
    try {
      const res = await fetch('/api/qrecords')
      if (res.ok) {
        const data: QRecord[] = (await res.json()).map((r: QRecord) => mergeAction(r, actMap))
        setRecords(data)
        try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
        setError(null)
      } else throw new Error('server error')
    } catch {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) {
          const parsed: QRecord[] = JSON.parse(raw)
          setRecords(parsed.map(r => mergeAction(r, actMap)))
        }
      } catch {}
      setError('Offline rejimda ishlamoqda')
    } finally {
      if (!background) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 60_000)
    const onFocus = () => load(true)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) load(true)
    })
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const addRecord = useCallback(async (r: Omit<QRecord, 'id' | 'cause' | 'action' | 'brakePoint' | 'photoAfter' | 'isResolved' | 'resolvedByName' | 'resolvedAt'>) => {
    const full: Omit<QRecord, 'id'> = {
      ...r,
      cause: null, action: null, brakePoint: null,
      photoAfter: null, isResolved: false,
      resolvedByName: null, resolvedAt: null,
    }
    try {
      const res = await fetch('/api/qrecords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(full),
      })
      const data: QRecord = await res.json()
      setRecords(prev => {
        const next = [data, ...prev]
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    } catch {
      const newRec: QRecord = { ...full, id: `local-${Date.now()}` }
      setRecords(prev => {
        const next = [newRec, ...prev]
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    }
  }, [])

  const updateSector = useCallback(async (id: string, sector: string) => {
    setRecords(prev => {
      const next = prev.map(r => r.id === id ? { ...r, sector } : r)
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
    try {
      await fetch('/api/qrecords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, sector }),
      })
    } catch {}
  }, [])

  const updateCorrectiveAction = useCallback(async (id: string, data: CorrectiveAction) => {
    const now = new Date().toISOString()
    const update: Partial<QRecord> = {
      cause:          data.cause,
      action:         data.action,
      brakePoint:     data.brakePoint,
      photoAfter:     data.photoAfter,
      isResolved:     true,
      resolvedByName: data.resolvedByName,
      resolvedAt:     now,
    }
    // Save to actions map (persistent even without DB)
    const actMap = loadActions()
    actMap[id] = { ...actMap[id], ...update }
    saveActions(actMap)

    // Optimistic update
    setRecords(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...update } : r)
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })

    // Try DB update
    try {
      await fetch('/api/qrecords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...update }),
      })
    } catch {}
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id)
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
    // Remove from actions map too
    const actMap = loadActions()
    delete actMap[id]
    saveActions(actMap)

    try {
      await fetch(`/api/qrecords?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {}
  }, [])

  return (
    <Ctx.Provider value={{ records, loading, error, addRecord, updateSector, updateCorrectiveAction, deleteRecord, refresh: load }}>
      {children}
    </Ctx.Provider>
  )
}

export function useQRecords() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useQRecords must be inside QRecordsProvider')
  return c
}

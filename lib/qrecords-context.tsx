'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
export type QRecordType = 'drr' | 'drl' | 'pdi' | 'gca'
export type QShift = 'A' | 'B' | 'D'

export interface QRecord {
  id: string
  type: QRecordType
  date: string          // YYYY-MM-DD
  shift: QShift
  shop: string
  sector: string | null // assigned by engineer
  code: string
  codeName: string
  factor: number
  count: number
  notes: string | null
  imageUrl: string | null
  createdByName: string | null
}

interface QRecordsCtx {
  records: QRecord[]
  loading: boolean
  error: string | null
  addRecord: (r: Omit<QRecord, 'id'>) => Promise<void>
  updateSector: (id: string, sector: string) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<QRecordsCtx | null>(null)
const LS_KEY = 'qrecords_local_v1'

// ─── Provider ──────────────────────────────────────────────────────────────────
export function QRecordsProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<QRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/qrecords')
      if (res.ok) {
        const data: QRecord[] = await res.json()
        setRecords(data)
        try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
        setError(null)
      } else {
        throw new Error('server error')
      }
    } catch {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) setRecords(JSON.parse(raw))
      } catch {}
      setError('Offline rejimda ishlamoqda')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addRecord = useCallback(async (r: Omit<QRecord, 'id'>) => {
    try {
      const res = await fetch('/api/qrecords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      })
      const data: QRecord = await res.json()
      setRecords(prev => {
        const next = [data, ...prev]
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    } catch {
      const newRec: QRecord = { ...r, id: `local-${Date.now()}` }
      setRecords(prev => {
        const next = [newRec, ...prev]
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    }
  }, [])

  const updateSector = useCallback(async (id: string, sector: string) => {
    // Optimistic
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

  const deleteRecord = useCallback(async (id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id)
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
    try {
      await fetch(`/api/qrecords?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {}
  }, [])

  return (
    <Ctx.Provider value={{ records, loading, error, addRecord, updateSector, deleteRecord, refresh: load }}>
      {children}
    </Ctx.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useQRecords() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useQRecords must be inside QRecordsProvider')
  return c
}

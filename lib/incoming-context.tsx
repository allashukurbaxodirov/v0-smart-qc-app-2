'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface IncomingRecord {
  id: string
  partNumber: string
  warehouse: 'WAREHOUSE-1' | 'WAREHOUSE-2' | 'SP ZONE'
  supplier: string
  partName: string
  totalCount: number
  defectCount: number
  defectCode: string | null
  defectCodeName: string | null
  defectReason: string | null
  shift: 'A' | 'B' | 'D'
  date: string
  createdByName: string | null
}

interface IncomingCtx {
  records: IncomingRecord[]
  loading: boolean
  error: string | null
  addRecord: (r: Omit<IncomingRecord, 'id'>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<IncomingCtx | null>(null)
const LS_KEY = 'incoming_records_local_v1'

// ─── Provider ──────────────────────────────────────────────────────────────────
export function IncomingProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<IncomingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/incoming')
      if (res.ok) {
        const data: IncomingRecord[] = await res.json()
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

  const addRecord = useCallback(async (r: Omit<IncomingRecord, 'id'>) => {
    try {
      const res = await fetch('/api/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      })
      const data: IncomingRecord = await res.json()
      setRecords(prev => {
        const next = [data, ...prev]
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    } catch {
      const newRec: IncomingRecord = { ...r, id: `local-${Date.now()}` }
      setRecords(prev => {
        const next = [newRec, ...prev]
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    }
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id)
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
    try {
      await fetch(`/api/incoming?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {}
  }, [])

  return (
    <Ctx.Provider value={{ records, loading, error, addRecord, deleteRecord, refresh: load }}>
      {children}
    </Ctx.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useIncoming() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useIncoming must be inside IncomingProvider')
  return c
}

'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface DRecord {
  id: string
  type: 'd10' | 'd20'
  image_url?: string
  shop: 'PRESS SHOP' | 'WELDING-1' | 'WELDING-2'
  sector?: string | null
  pono?: string | null
  code: string
  codeName: string
  factor: number
  count: number
  notes?: string
  date: string
  shift?: string | null
  created_by_name?: string | null
}

interface DRecordsContextType {
  records: DRecord[]
  loading: boolean
  error: string | null
  addRecord: (record: Omit<DRecord, 'id'>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  refresh: () => Promise<void>
  getTotalDefects: () => number
  getDefectsByShop: () => Record<string, number>
}

const DRecordsContext = createContext<DRecordsContextType | undefined>(undefined)

const LS_KEY = 'd_records_local_v2'

function lsLoad(): DRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function lsSave(records: DRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(records))
  } catch {}
}

function lsRemove(id: string) {
  lsSave(lsLoad().filter((r) => r.id !== id))
}

export function DRecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<DRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRecords = async (background = false) => {
    if (!background) setLoading(true)
    try {
      const r = await fetch('/api/d-records')
      if (!r.ok) throw new Error(`Server xatosi: ${r.status}`)
      const data = await r.json()

      if (Array.isArray(data)) {
        const dbRecords: DRecord[] = data.map((r: any) => ({
          id:              r.id,
          type:            r.type,
          shop:            r.shop,
          sector:          r.sector  ?? null,
          pono:            r.pono    ?? null,
          code:            r.code,
          codeName:        r.code_name,
          factor:          Number(r.factor),
          count:           Number(r.count),
          notes:           r.notes   ?? undefined,
          image_url:       r.image_url ?? undefined,
          date:            r.date,
          shift:           r.shift   ?? null,
          created_by_name: r.created_by_name ?? null,
        }))

        const localOnly = lsLoad().filter(
          (ls) =>
            (ls.id.startsWith('local-') || ls.id.startsWith('mem-')) &&
            !dbRecords.find((db) => db.id === ls.id)
        )

        const merged = [...localOnly, ...dbRecords].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        setRecords(merged)
        lsSave(merged)
        setError(null)
      }
    } catch {
      const cached = lsLoad()
      if (cached.length > 0) setRecords(cached)
      setError('Offline rejimda — DB ga ulanib bo\'lmadi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
    const interval = setInterval(() => loadRecords(true), 60_000)
    const onFocus = () => loadRecords(true)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadRecords(true)
    })
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const refresh = () => loadRecords()

  // ─── addRecord: date, shift, pono — hammasini yuboradi ───────────────────────
  const addRecord = async (record: Omit<DRecord, 'id'>) => {
    const today = new Date().toISOString().split('T')[0]
    const payload = {
      type:     record.type,
      shop:     record.shop,
      sector:   record.sector  ?? null,
      pono:     record.pono    ?? null,
      code:     record.code,
      codeName: record.codeName,
      factor:   record.factor,
      count:    record.count,
      notes:    record.notes   ?? null,
      imageUrl: record.image_url ?? null,
      date:     record.date    || today,
      shift:    record.shift   || 'A',
    }

    try {
      const res = await fetch('/api/d-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      const newRecord = text ? JSON.parse(text) : null

      if (res.ok && newRecord) {
        const mapped: DRecord = {
          id:              newRecord.id,
          type:            newRecord.type,
          shop:            newRecord.shop,
          sector:          newRecord.sector   ?? null,
          pono:            newRecord.pono     ?? null,
          code:            newRecord.code,
          codeName:        newRecord.code_name,
          factor:          Number(newRecord.factor),
          count:           Number(newRecord.count),
          notes:           newRecord.notes    ?? undefined,
          image_url:       newRecord.image_url ?? undefined,
          date:            newRecord.date     || payload.date,
          shift:           newRecord.shift    ?? payload.shift,
          created_by_name: newRecord.created_by_name ?? null,
        }
        setRecords((prev) => {
          const updated = [mapped, ...prev]
          lsSave(updated)
          return updated
        })
      } else {
        _saveLocal(payload, today)
      }
    } catch {
      _saveLocal(payload, today)
    }
  }

  function _saveLocal(payload: any, today: string) {
    const localRecord: DRecord = {
      id:       `local-${Date.now()}`,
      type:     payload.type,
      shop:     payload.shop,
      sector:   payload.sector  ?? null,
      pono:     payload.pono    ?? null,
      code:     payload.code,
      codeName: payload.codeName,
      factor:   Number(payload.factor),
      count:    Number(payload.count),
      notes:    payload.notes   ?? undefined,
      image_url:payload.imageUrl ?? undefined,
      date:     payload.date    || today,
      shift:    payload.shift   || 'A',
    }
    setRecords((prev) => {
      const updated = [localRecord, ...prev]
      lsSave(updated)
      return updated
    })
  }

  const deleteRecord = async (id: string) => {
    lsRemove(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
    if (!id.startsWith('local-') && !id.startsWith('mem-')) {
      try { await fetch(`/api/d-records?id=${id}`, { method: 'DELETE' }) } catch {}
    }
  }

  const getTotalDefects  = () => records.reduce((sum, r) => sum + r.count, 0)
  const getDefectsByShop = () => {
    const byShop: Record<string, number> = {}
    records.forEach((r) => { byShop[r.shop] = (byShop[r.shop] || 0) + r.count })
    return byShop
  }

  return (
    <DRecordsContext.Provider value={{ records, loading, error, addRecord, deleteRecord, refresh, getTotalDefects, getDefectsByShop }}>
      {children}
    </DRecordsContext.Provider>
  )
}

export function useDRecords() {
  const context = useContext(DRecordsContext)
  if (!context) throw new Error('useDRecords must be used within DRecordsProvider')
  return context
}

'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
export type Shift = 'A' | 'B' | 'D'
export type ShopType = 'PRESS SHOP' | 'WELDING-1' | 'WELDING-2' | 'PAINT SHOP' | 'GA'

export const SHOPS_ALL: ShopType[] = ['PRESS SHOP', 'WELDING-1', 'WELDING-2', 'PAINT SHOP', 'GA']

export const SHOP_LINES: Record<ShopType, string[]> = {
  'PRESS SHOP': ['LINIYA-250T', 'LINIYA-800T', 'LINIYA-1200T'],
  'WELDING-1':  ['MAINBODY', 'SIDEBODY', 'UNDERBODY', 'BIW'],
  'WELDING-2':  ['MAINBODY', 'SIDEBODY', 'UNDERBODY', 'BIW'],
  'PAINT SHOP': ['QATLAM-1', 'QATLAM-2', 'QATLAM-3', 'QATLAM-4'],
  'GA':         ['TRIM', 'CHASSIS', 'SUB', 'FINAL'],
}

export interface ShiftEntry {
  id: string
  date: string       // YYYY-MM-DD
  shift: Shift
  shop: ShopType
  line: string
  drr: number        // Daily Rejection Rate (rad etilganlar)
  drl: number        // Daily Rework Level (qayta ishlash)
  incoming: number   // Incoming Control
  pdi: number        // PDI
  notes?: string
}

interface ShiftCtx {
  entries: ShiftEntry[]
  loading: boolean
  upsertEntry: (e: Omit<ShiftEntry, 'id'> & { id?: string }) => void
  deleteEntry: (id: string) => void
  getForShiftDate: (shift: Shift, date: string) => ShiftEntry[]
}

const Ctx = createContext<ShiftCtx | null>(null)
const LS_KEY = 'shift_entries_v1'

// ─── Provider ──────────────────────────────────────────────────────────────────
export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ShiftEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Yuklash: avval API, keyin localStorage fallback
  useEffect(() => {
    const migrateLocalStorage = async (apiData: ShiftEntry[]) => {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return
        const localEntries: ShiftEntry[] = JSON.parse(raw)
        const apiIds = new Set(apiData.map(e => e.id))
        const toMigrate = localEntries.filter(e => !apiIds.has(e.id))
        for (const e of toMigrate) {
          await fetch('/api/shift-entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(e),
          }).catch(() => {})
        }
        localStorage.removeItem(LS_KEY)
      } catch {}
    }

    fetch('/api/shift-entries')
      .then(r => r.ok ? r.json() : null)
      .then(async (data: ShiftEntry[] | null) => {
        if (data) {
          await migrateLocalStorage(data)
          // Re-fetch after migration
          const fresh = await fetch('/api/shift-entries').then(r => r.ok ? r.json() : data).catch(() => data)
          setEntries(fresh)
        } else {
          // API unavailable — fallback to localStorage
          try {
            const raw = localStorage.getItem(LS_KEY)
            if (raw) setEntries(JSON.parse(raw))
          } catch {}
        }
        setLoading(false)
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (raw) setEntries(JSON.parse(raw))
        } catch {}
        setLoading(false)
      })
  }, [])

  const upsertEntry = useCallback((e: Omit<ShiftEntry, 'id'> & { id?: string }) => {
    const id    = e.id ?? `se-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const entry: ShiftEntry = { ...e, id } as ShiftEntry

    setEntries(prev => {
      const exists = prev.some(x => x.id === id)
      return exists ? prev.map(x => (x.id === id ? entry : x)) : [entry, ...prev]
    })

    // API ga saqlash
    fetch('/api/shift-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {
      // API unavailable — localStorage fallback
      setEntries(prev => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(prev)) } catch {}
        return prev
      })
    })
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const next = prev.filter(x => x.id !== id)
      // API ga o'chirish
      fetch(`/api/shift-entries?id=${id}`, { method: 'DELETE' }).catch(() => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      })
      return next
    })
  }, [])

  const getForShiftDate = useCallback(
    (shift: Shift, date: string) => entries.filter(e => e.shift === shift && e.date === date),
    [entries]
  )

  return (
    <Ctx.Provider value={{ entries, loading, upsertEntry, deleteEntry, getForShiftDate }}>
      {children}
    </Ctx.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useShift() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useShift must be inside ShiftProvider')
  return c
}

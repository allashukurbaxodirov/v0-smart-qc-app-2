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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setEntries(JSON.parse(raw))
    } catch {}
    setLoading(false)
  }, [])

  const persist = (next: ShiftEntry[]) => {
    setEntries(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
  }

  const upsertEntry = useCallback((e: Omit<ShiftEntry, 'id'> & { id?: string }) => {
    setEntries(prev => {
      const id = e.id ?? `se-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const entry: ShiftEntry = { ...e, id } as ShiftEntry
      const exists = prev.some(x => x.id === id)
      const next = exists
        ? prev.map(x => (x.id === id ? entry : x))
        : [entry, ...prev]
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const next = prev.filter(x => x.id !== id)
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
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

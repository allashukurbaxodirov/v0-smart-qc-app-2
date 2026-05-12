'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface GCARecord {
  id: string
  image_url?: string
  shop: 'PRESS SHOP' | 'WELDING-1' | 'WELDING-2' | 'PAINT SHOP' | 'GA'
  code: string
  codeName: string
  factor: number
  count: number
  notes?: string
  date: string
}

interface GCAContextType {
  records: GCARecord[]
  loading: boolean
  error: string | null
  addRecord: (record: Omit<GCARecord, 'id' | 'date'>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  getTotalDefects: () => number
  getDefectsByShop: () => Record<string, number>
}

const GCAContext = createContext<GCAContextType | undefined>(undefined)

export function GCAProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<GCARecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/gca')
      .then((r) => {
        if (!r.ok) throw new Error(`Server xatosi: ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setRecords(data.map((r: any) => ({
            id: r.id,
            shop: r.shop,
            code: r.code,
            codeName: r.code_name,
            factor: r.factor,
            count: r.count,
            notes: r.notes,
            image_url: r.image_url,
            date: r.date,
          })))
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const addRecord = async (record: Omit<GCARecord, 'id' | 'date'>) => {
    const res = await fetch('/api/gca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop: record.shop,
        code: record.code,
        codeName: record.codeName,
        factor: record.factor,
        count: record.count,
        notes: record.notes,
        imageUrl: record.image_url,
      }),
    })
    const newRecord = await res.json()
    if (res.ok) {
      setRecords((prev) => [{
        id: newRecord.id,
        shop: newRecord.shop,
        code: newRecord.code,
        codeName: newRecord.code_name,
        factor: newRecord.factor,
        count: newRecord.count,
        notes: newRecord.notes,
        image_url: newRecord.image_url,
        date: newRecord.date,
      }, ...prev])
    }
  }

  const deleteRecord = async (id: string) => {
    const res = await fetch(`/api/gca?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } else {
      setError("Yozuvni o'chirishda xato yuz berdi")
    }
  }

  const getTotalDefects = () => records.reduce((sum, r) => sum + r.count, 0)

  const getDefectsByShop = () => {
    const byShop: Record<string, number> = {}
    records.forEach((r) => {
      byShop[r.shop] = (byShop[r.shop] || 0) + r.count
    })
    return byShop
  }

  return (
    <GCAContext.Provider value={{ records, loading, error, addRecord, deleteRecord, getTotalDefects, getDefectsByShop }}>
      {children}
    </GCAContext.Provider>
  )
}

export function useGCA() {
  const context = useContext(GCAContext)
  if (!context) throw new Error('useGCA must be used within GCAProvider')
  return context
}

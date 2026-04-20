'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface GCARecord {
  id: string
  image?: string
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
  addRecord: (record: Omit<GCARecord, 'id' | 'date'>) => void
  deleteRecord: (id: string) => void
  getTotalDefects: () => number
  getDefectsByShop: () => Record<string, number>
}

const GCAContext = createContext<GCAContextType | undefined>(undefined)

export function GCAProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<GCARecord[]>([
    {
      id: '1',
      shop: 'PRESS SHOP',
      code: '63',
      codeName: 'O\'lcham xatosi',
      factor: 20,
      count: 8,
      date: '2026-04-18',
    },
    {
      id: '2',
      shop: 'WELDING-1',
      code: '45',
      codeName: 'Qaynash ekilmasa qolgan',
      factor: 23,
      count: 12,
      date: '2026-04-17',
    },
    {
      id: '3',
      shop: 'PAINT SHOP',
      code: '86',
      codeName: 'Bo\'yoq oqishi',
      factor: 25,
      count: 34,
      date: '2026-04-16',
    },
    {
      id: '4',
      shop: 'GA',
      code: '18',
      codeName: 'Detalda nuqson bor',
      factor: 20,
      count: 24,
      date: '2026-04-15',
    },
  ])

  const addRecord = (record: Omit<GCARecord, 'id' | 'date'>) => {
    const newRecord: GCARecord = {
      ...record,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
    }
    setRecords([newRecord, ...records])
  }

  const deleteRecord = (id: string) => {
    setRecords(records.filter((record) => record.id !== id))
  }

  const getTotalDefects = () => {
    return records.reduce((sum, record) => sum + record.count, 0)
  }

  const getDefectsByShop = () => {
    const byShop: Record<string, number> = {}
    records.forEach((record) => {
      byShop[record.shop] = (byShop[record.shop] || 0) + record.count
    })
    return byShop
  }

  return (
    <GCAContext.Provider
      value={{
        records,
        addRecord,
        deleteRecord,
        getTotalDefects,
        getDefectsByShop,
      }}
    >
      {children}
    </GCAContext.Provider>
  )
}

export function useGCA() {
  const context = useContext(GCAContext)
  if (!context) {
    throw new Error('useGCA must be used within GCAProvider')
  }
  return context
}

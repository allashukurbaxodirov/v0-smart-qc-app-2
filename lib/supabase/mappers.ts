'use client'

import { GCADefect } from './queries'
import { gcaDefectFactors } from '@/lib/mock-data'

export interface MappedDefect {
  code: string
  name: string
  count: number
  factor: number
  risk: 'high' | 'medium' | 'low'
}

export function mapSupabaseDefectToUI(defect: GCADefect): MappedDefect {
  const factorData = gcaDefectFactors[defect.defect_code as keyof typeof gcaDefectFactors]
  const risk = defect.factor >= 20 ? 'high' : defect.factor >= 15 ? 'medium' : 'low'

  return {
    code: defect.defect_code,
    name: defect.defect_name,
    count: defect.quantity,
    factor: defect.factor,
    risk: risk,
  }
}

export function mapUIDefectToSupabase(
  uiDefect: MappedDefect,
  shop: string,
  shift: string,
  userId: string
): Omit<GCADefect, 'id' | 'created_at' | 'updated_at'> {
  return {
    defect_code: uiDefect.code,
    defect_name: uiDefect.name,
    factor: uiDefect.factor,
    quantity: uiDefect.count,
    shop,
    shift,
    created_by: userId,
    status: 'yangi',
  }
}

// Helper to determine risk level from factor
export function getRiskFromFactor(factor: number): 'high' | 'medium' | 'low' {
  if (factor >= 20) return 'high'
  if (factor >= 15) return 'medium'
  return 'low'
}

// Helper to get Uzbek risk label
export function getRiskLabelUzbek(risk: 'high' | 'medium' | 'low'): string {
  switch (risk) {
    case 'high':
      return 'Yuqori'
    case 'medium':
      return "O'rtacha"
    case 'low':
      return 'Past'
  }
}

// Helper to get risk CSS color class
export function getRiskColorClass(risk: 'high' | 'medium' | 'low'): string {
  switch (risk) {
    case 'high':
      return 'bg-critical text-white'
    case 'medium':
      return 'bg-warning text-white'
    case 'low':
      return 'bg-success text-white'
  }
}

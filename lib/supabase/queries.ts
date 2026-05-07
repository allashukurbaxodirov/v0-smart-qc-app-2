'use client'

import { createClient } from './client'

export interface GCADefect {
  id: string
  defect_code: string
  defect_name: string
  factor: number
  quantity: number
  shop: string
  sector?: string
  shift: string
  comment?: string
  image_url?: string
  created_by: string
  assigned_to_role?: string
  assigned_to_shop?: string
  status: string
  created_at: string
  updated_at: string
}

export interface GCAAction {
  id: string
  defect_id: string
  action_text: string
  responsible_user?: string
  status: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  full_name?: string
  role: string
  shop?: string
  sector?: string
  created_at: string
  updated_at: string
}

// Defect queries
export async function getDefects(filters?: {
  shop?: string
  status?: string
  shift?: string
  startDate?: string
  endDate?: string
}) {
  const supabase = createClient()
  let query = supabase.from('gca_defects').select('*')

  if (filters?.shop) query = query.eq('shop', filters.shop)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.shift) query = query.eq('shift', filters.shift)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as GCADefect[]
}

export async function getDefectById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gca_defects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as GCADefect
}

export async function createDefect(defect: Omit<GCADefect, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gca_defects')
    .insert([defect])
    .select()
    .single()

  if (error) throw error
  return data as GCADefect
}

export async function updateDefect(
  id: string,
  updates: Partial<Omit<GCADefect, 'id' | 'created_at' | 'updated_at'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gca_defects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as GCADefect
}

export async function deleteDefect(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('gca_defects').delete().eq('id', id)

  if (error) throw error
}

// Action queries
export async function getActionsByDefectId(defectId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gca_actions')
    .select('*')
    .eq('defect_id', defectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as GCAAction[]
}

export async function createAction(action: Omit<GCAAction, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gca_actions')
    .insert([action])
    .select()
    .single()

  if (error) throw error
  return data as GCAAction
}

export async function updateAction(
  id: string,
  updates: Partial<Omit<GCAAction, 'id' | 'created_at' | 'updated_at'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gca_actions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as GCAAction
}

// Profile queries
export async function getUserProfile(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as UserProfile | null
}

export async function createUserProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .insert([profile])
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

// Statistics queries
export async function getDefectStats(filters?: { shop?: string; shift?: string }) {
  const defects = await getDefects(filters)
  
  return {
    total: defects.reduce((sum, d) => sum + d.quantity, 0),
    byShop: defects.reduce((acc, d) => {
      acc[d.shop] = (acc[d.shop] || 0) + d.quantity
      return acc
    }, {} as Record<string, number>),
    byStatus: defects.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    defects,
  }
}

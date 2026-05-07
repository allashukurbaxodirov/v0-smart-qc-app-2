'use client'

import useSWR from 'swr'
import { getDefects, getActionsByDefectId, getUserProfile, type GCADefect, type GCAAction, type UserProfile } from './queries'

export function useDefects(filters?: {
  shop?: string
  status?: string
  shift?: string
  startDate?: string
  endDate?: string
}) {
  const filterKey = filters ? JSON.stringify(filters) : null

  const { data, error, isLoading, mutate } = useSWR(
    filterKey ? ['defects', filterKey] : null,
    async () => {
      try {
        return await getDefects(filters)
      } catch (err) {
        console.error('[v0] Error fetching defects:', err)
        throw err
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    defects: data || [],
    isLoading,
    error,
    mutate,
  }
}

export function useDefectActions(defectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    defectId ? ['actions', defectId] : null,
    async () => {
      try {
        return await getActionsByDefectId(defectId)
      } catch (err) {
        console.error('[v0] Error fetching actions:', err)
        throw err
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    actions: data || [],
    isLoading,
    error,
    mutate,
  }
}

export function useUserProfile(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? ['profile', userId] : null,
    async () => {
      try {
        return await getUserProfile(userId)
      } catch (err) {
        console.error('[v0] Error fetching profile:', err)
        throw err
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  )

  return {
    profile: data,
    isLoading,
    error,
    mutate,
  }
}

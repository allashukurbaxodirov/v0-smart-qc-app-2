import { GCADefect } from './queries'
import { gcaDefectsByShop } from '@/lib/mock-data'

// This utility generates mock defects that match the Supabase schema
// for development and testing purposes

export function generateMockDefects(): GCADefect[] {
  const mockDefects: GCADefect[] = []
  const shifts = ['A', 'B', 'D']
  const mockUserId = '00000000-0000-0000-0000-000000000000'
  let id = 1

  // Iterate through shops and their defects from mock data
  for (const [shop, shopDefects] of Object.entries(gcaDefectsByShop)) {
    shopDefects.forEach((defect, index) => {
      const shift = shifts[index % shifts.length]
      mockDefects.push({
        id: `mock-${id}`,
        defect_code: defect.code,
        defect_name: defect.name,
        factor: defect.factor,
        quantity: defect.count,
        shop: shop as string,
        sector: 'Default',
        shift,
        comment: `Mock defect for testing - ${defect.name}`,
        created_by: mockUserId,
        status: 'yangi',
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      id++
    })
  }

  return mockDefects
}

// Helper to simulate filtering
export function filterMockDefects(
  defects: GCADefect[],
  filters?: {
    shop?: string
    status?: string
    shift?: string
    startDate?: string
    endDate?: string
  }
): GCADefect[] {
  return defects.filter((defect) => {
    if (filters?.shop && defect.shop !== filters.shop) return false
    if (filters?.status && defect.status !== filters.status) return false
    if (filters?.shift && defect.shift !== filters.shift) return false
    if (filters?.startDate && new Date(defect.created_at) < new Date(filters.startDate)) return false
    if (filters?.endDate && new Date(defect.created_at) > new Date(filters.endDate)) return false
    return true
  })
}

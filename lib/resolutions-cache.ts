// ─── Resolutions in-memory cache ─────────────────────────────────────────────
// Engineer resolution qarorlarini xotirada va faylda saqlaydi

import fs from 'fs'
import path from 'path'

export type ResolutionStatus = 'ochiq' | 'jarayonda' | 'yopilgan' | 'uzatilgan'

export interface Resolution {
  id:                 string          // recordId + '_' + type (e.g. "abc123_ga")
  recordId:           string
  type:               'ga' | 'welding'
  status:             ResolutionStatus
  problemDescription: string
  rootCause:          string
  immediateAction:    string
  mainAction:         string
  decision:           'resolved' | 'transfer'
  transferTarget:     string
  transferReason:     string
  resolvedAt:         string
  createdBy:          string          // engineer tabel number
  createdByName:      string
}

const FILE = path.join(process.cwd(), '.resolutions-local.json')
const MAX  = 2000

// ─── GlobalThis singleton ─────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __resolutionsCache: Resolution[] | undefined
}

function loadFromFile(): Resolution[] {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Resolution[]
    }
  } catch {}
  return []
}

function saveToFile(data: Resolution[]) {
  try { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)) } catch {}
}

function getCache(): Resolution[] {
  if (!globalThis.__resolutionsCache) {
    globalThis.__resolutionsCache = loadFromFile()
  }
  return globalThis.__resolutionsCache
}

export const resolutionsCache = {
  getAll(): Resolution[] {
    return getCache()
  },

  getByType(type: 'ga' | 'welding'): Resolution[] {
    return getCache().filter(r => r.type === type)
  },

  getByRecordId(recordId: string): Resolution | undefined {
    return getCache().find(r => r.recordId === recordId)
  },

  upsert(res: Resolution): void {
    const cache = getCache()
    const idx   = cache.findIndex(r => r.recordId === res.recordId && r.type === res.type)
    if (idx >= 0) {
      cache[idx] = res
    } else {
      cache.unshift(res)
      if (cache.length > MAX) cache.splice(MAX)
    }
    globalThis.__resolutionsCache = cache
    saveToFile(cache)
  },

  // Map format: { [recordId]: Resolution } for backward compat with client code
  asMap(type: 'ga' | 'welding'): Record<string, Resolution> {
    const map: Record<string, Resolution> = {}
    getCache()
      .filter(r => r.type === type)
      .forEach(r => { map[r.recordId] = r })
    return map
  },
}

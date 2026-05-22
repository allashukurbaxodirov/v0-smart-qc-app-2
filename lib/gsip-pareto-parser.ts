/**
 * GSIP DRL Pareto Excel → SmartQC
 * Sheet: "Direct Run Loss Pareto"
 *
 * Columns (0-indexed):
 *  0  R/S          – "S" (standard) | "R" (skip)
 *  1  Model Group  – "R7" → DAMAS | "R7A" → LABO
 *  2  PART_LVL1_ID
 *  3  Level 1      – part category
 *  4  PART_LVL2_ID
 *  5  Level 2
 *  6  PART_LVL3_ID
 *  7  Level 3
 *  8  PART_LVL4_ID (nullable)
 *  9  Level 4      (nullable)
 * 10  FAULT_ID
 * 11  Fault        – "027 Выемка"
 * 12  BPD_ID
 * 13  Prod Team    – "00.BO.HAPO"
 * 14  Count
 * 15  DRL_RATIO
 * 16  VEH_CNT
 */

import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DRLImportRow {
  rowType:    string         // S or R
  modelGroup: string         // R7 / R7A
  modelLabel: string         // DAMAS / LABO
  partLv1:    string
  partLv2:    string
  partLv3:    string
  partLv4:    string
  faultId:    number | null
  faultCode:  string         // "027"
  faultName:  string         // "Выемка"
  prodTeam:   string         // "00.BO.HAPO"
  shop:       string         // "WELDING"
  count:      number
  drlRatio:   number
  vehCnt:     number
}

export interface DRLImportMeta {
  dateFrom:   string   // "2026-05-19"
  dateTo:     string
  shiftFrom:  string   // "E"
  shiftTo:    string   // "N"
  models:     string[] // ["R7","R7A"]
}

export interface Top10Fault {
  rank:        number
  faultCode:   string
  faultName:   string
  totalCount:  number
  drlRatioSum: number
  topShop:     string
  topProdTeam: string
  modelDamas:  number
  modelLabo:   number
  topPartLv1:  string
  assignedRole: string  // welding_engineer / ga_engineer / etc.
}

export interface ParseResult {
  meta:       DRLImportMeta
  rows:       DRLImportRow[]
  top10:      Top10Fault[]
  skipped:    number
  warnings:   string[]
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

/** Prod Team prefix → SmartQC Shop name */
export function prodTeamToShop(team: string): string {
  if (!team) return 'UNKNOWN'
  const t = team.toUpperCase()
  if (t.startsWith('00.BO')) return 'WELDING'
  if (t.startsWith('00.PA')) return 'PAINT SHOP'
  if (t.startsWith('00.GA') || t.startsWith('00.SQ') || t.startsWith('00.SC')) return 'GA'
  if (t.startsWith('00.PR')) return 'PRESS SHOP'
  return 'GA'  // default fallback
}

/** Prod Team prefix → Engineer role */
export function prodTeamToRole(team: string): string {
  if (!team) return 'ga_engineer'
  const t = team.toUpperCase()
  if (t.startsWith('00.BO')) return 'welding_engineer'
  if (t.startsWith('00.PA')) return 'ga_engineer'   // paint → GA engineer (no paint role yet)
  if (t.startsWith('00.PR')) return 'ga_engineer'   // press → GA engineer
  return 'ga_engineer'
}

/** Model Group → label */
export function modelGroupToLabel(mg: string): string {
  if (mg === 'R7')  return 'DAMAS'
  if (mg === 'R7A') return 'LABO'
  return mg
}

/** Priority based on count */
export function countToPriority(count: number): string {
  if (count >= 100) return 'critical'
  if (count >= 40)  return 'high'
  if (count >= 15)  return 'medium'
  return 'low'
}

// ─── Filter Row Parser ────────────────────────────────────────────────────────
// "Filter By: From: 19.05.2026 - E, To: 19.05.2026 - N, Model Group: R7 - Damas 85,R7 - Labo 80, Metric: DRL"

function parseDate(ddmmyyyy: string): string {
  // "19.05.2026" → "2026-05-19"
  const parts = ddmmyyyy.trim().split('.')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return new Date().toISOString().split('T')[0]
}

export function parseFilterRow(filterStr: string): DRLImportMeta {
  const defaults: DRLImportMeta = {
    dateFrom:  new Date().toISOString().split('T')[0],
    dateTo:    new Date().toISOString().split('T')[0],
    shiftFrom: 'E',
    shiftTo:   'N',
    models:    ['R7', 'R7A'],
  }
  if (!filterStr) return defaults

  try {
    // From: 19.05.2026 - E
    const fromMatch = filterStr.match(/From:\s*([\d.]+)\s*-\s*([A-Z])/i)
    // To: 19.05.2026 - N
    const toMatch   = filterStr.match(/To:\s*([\d.]+)\s*-\s*([A-Z])/i)
    // Model Group: R7 ..., R7A ...
    const modelMatch = filterStr.match(/Model Group:\s*([^,\n]+(?:,[^,\n]+)*?)(?:,\s*Metric|$)/i)

    if (fromMatch) {
      defaults.dateFrom  = parseDate(fromMatch[1])
      defaults.shiftFrom = fromMatch[2].toUpperCase()
    }
    if (toMatch) {
      defaults.dateTo  = parseDate(toMatch[1])
      defaults.shiftTo = toMatch[2].toUpperCase()
    }
    if (modelMatch) {
      const modelStr = modelMatch[1]
      const models: string[] = []
      if (modelStr.includes('R7A') || modelStr.includes('Labo')) models.push('R7A')
      if (modelStr.includes('R7')  || modelStr.includes('Damas')) {
        if (!models.includes('R7')) models.unshift('R7')
      }
      if (models.length > 0) defaults.models = models
    }
  } catch { /* use defaults */ }

  return defaults
}

// ─── Safe number helpers ──────────────────────────────────────────────────────

/** NaN / Infinity / string → 0 (integer-safe) */
function safeInt(v: any): number {
  const n = Number(v)
  return (!isNaN(n) && isFinite(n)) ? Math.round(n) : 0
}

/** NaN / Infinity / string → 0 (float-safe) */
function safeFloat(v: any): number {
  const n = Number(v)
  return (!isNaN(n) && isFinite(n)) ? n : 0
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseGsipPareto(buffer: Buffer): ParseResult {
  const warnings: string[] = []
  let skipped = 0

  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

  // Row 2 (index 2) → filter string
  const filterStr = String(raw[2]?.[0] ?? '')
  const meta = parseFilterRow(filterStr)

  // Row 4 (index 4) → headers, Row 5+ → data
  const dataRows = raw.slice(5)

  const rows: DRLImportRow[] = []

  for (const r of dataRows) {
    // Skip empty rows
    if (!r || !r[0]) { skipped++; continue }

    const rowType = String(r[0] ?? '').trim().toUpperCase()

    // Skip "R" rows (not standard defect rows)
    if (rowType === 'R') { skipped++; continue }

    const modelGroup = String(r[1]  ?? '').trim()
    const partLv1    = String(r[3]  ?? '').trim()
    const partLv2    = String(r[5]  ?? '').trim()
    const partLv3    = String(r[7]  ?? '').trim()
    const partLv4    = String(r[9]  ?? '').trim()
    const faultRaw   = String(r[11] ?? '').trim()
    const prodTeam   = String(r[13] ?? '').trim()
    const count      = safeInt(r[14])
    const drlRatio   = safeFloat(r[15])
    const vehCnt     = safeInt(r[16])

    if (!faultRaw || count <= 0) { skipped++; continue }

    // Parse fault:
    //  "027 Выемка"       → code="027", name="Выемка"
    //  "032. Брак функции"→ code="032", name="Брак функции"
    //  "V Образный Зазор" → code="V",   name="Образный Зазор"
    //  "Дефект от пресса" → code="—",   name="Дефект от пресса"
    let faultCode: string
    let faultName: string
    const m3digit = faultRaw.match(/^(\d{3})\.?\s+(.+)$/)
    const mLetter = faultRaw.match(/^([A-Za-z])\s+(.+)$/)
    if (m3digit) {
      faultCode = m3digit[1]
      faultName = m3digit[2]
    } else if (mLetter) {
      faultCode = mLetter[1]
      faultName = mLetter[2]
    } else {
      faultCode = '—'
      faultName = faultRaw
    }

    rows.push({
      rowType,
      modelGroup,
      modelLabel: modelGroupToLabel(modelGroup),
      partLv1,
      partLv2,
      partLv3,
      partLv4,
      faultId:  (r[10] != null && r[10] !== '') ? (safeInt(r[10]) || null) : null,
      faultCode,
      faultName,
      prodTeam,
      shop:     prodTeamToShop(prodTeam),
      count,
      drlRatio,
      vehCnt,
    })
  }

  // ── Compute Top 10 ────────────────────────────────────────────────────────
  interface FaultAgg {
    totalCount:  number
    drlRatioSum: number
    teams:  Record<string, number>
    models: Record<string, number>
    lv1s:   Record<string, number>
  }
  const faultMap: Record<string, FaultAgg> = {}

  for (const row of rows) {
    const key = `${row.faultCode}||${row.faultName}`
    if (!faultMap[key]) {
      faultMap[key] = { totalCount: 0, drlRatioSum: 0, teams: {}, models: {}, lv1s: {} }
    }
    const agg = faultMap[key]
    agg.totalCount  += row.count
    agg.drlRatioSum += row.drlRatio
    agg.teams[row.prodTeam]    = (agg.teams[row.prodTeam]    || 0) + row.count
    agg.models[row.modelGroup] = (agg.models[row.modelGroup] || 0) + row.count
    agg.lv1s[row.partLv1]     = (agg.lv1s[row.partLv1]     || 0) + row.count
  }

  const top10: Top10Fault[] = Object.entries(faultMap)
    .sort((a, b) => b[1].totalCount - a[1].totalCount)
    .slice(0, 10)
    .map(([key, agg], idx) => {
      const [faultCode, faultName] = key.split('||')
      const topTeam  = Object.entries(agg.teams).sort((a,b) => b[1]-a[1])[0]
      const topLv1   = Object.entries(agg.lv1s).sort((a,b)  => b[1]-a[1])[0]
      return {
        rank:        idx + 1,
        faultCode,
        faultName,
        totalCount:  agg.totalCount,
        drlRatioSum: Math.round(agg.drlRatioSum * 10) / 10,
        topShop:     prodTeamToShop(topTeam?.[0] ?? ''),
        topProdTeam: topTeam?.[0] ?? '',
        modelDamas:  agg.models['R7']  ?? 0,
        modelLabo:   agg.models['R7A'] ?? 0,
        topPartLv1:  topLv1?.[0] ?? '',
        assignedRole: prodTeamToRole(topTeam?.[0] ?? ''),
      }
    })

  return { meta, rows, top10, skipped, warnings }
}

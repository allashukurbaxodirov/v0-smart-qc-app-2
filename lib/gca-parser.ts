/**
 * GSIP GCA Defect Details Excel → SmartQC
 * Sheet: "GCA Defect Details"
 *
 * GCA = General Customer Acceptance — yig'ilish liniyasida qayd etilgan nuqsonlar
 * Har bir satr = BIR mashinadagi BIR nuqson (raw records, aggregatsiz)
 *
 * Kerakli ustunlar (Row 5 headers, 0-indexed):
 *  0   Reporting Date   – sana (Excel serial yoki matn)
 *  1   Level 1          – part kategory
 *  2   Level 2          – sub-category
 *  3   Level 3          – sub-sub-category
 *  4   Level 4          – (nullable)
 *  5   Level 5          – (nullable)
 *  6   Fault            – "071 Пузырьки Воздуха"
 *  7   GCA Weight       – og'irlik balli (5 yoki 10)
 *  8   Defect Note      – nuqson tavsifi
 *  9   GCA Fault Desc   – qo'shimcha tavsif
 *  10  GCA Zone Desc    – zona
 *  11  GCA Category     – kategoriya
 *  12  Production Team  – "PA.HAPO", "GA.GA-3", "SQ.SQ1"
 *  13  Seq. No.6        – ketma-ket raqam
 *  14  VIN              – avtomobil VIN kodi
 *
 * VIN → Model:
 *   vin.substring(5,7) === '12' → R7  (DAMAS)
 *   vin.substring(5,7) === '51' → R7A (LABO)
 *
 * Filter row (index 2):
 *   "Filter By: From: 20.05.2026 - E, To: 20.05.2026 - N, Model Group: R7 - Damas 85,..."
 */

import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GCAImportRow {
  reportingDate: string        // "2026-05-20"
  partLv1:       string
  partLv2:       string
  partLv3:       string
  partLv4:       string
  partLv5:       string
  faultCode:     string        // "071"
  faultName:     string        // "Пузырьки Воздуха"
  gcaWeight:     number        // 5 | 10
  defectNote:    string
  faultDesc:     string        // GCA Fault Desc
  zoneDesc:      string        // GCA Zone Desc
  category:      string        // GCA Category
  prodTeam:      string        // "PA.HAPO"
  shop:          string        // "PAINT SHOP" | "GA" | "WELDING" | "PRESS SHOP"
  seqNo:         string        // Seq. No.6
  vin:           string
  modelGroup:    string        // "R7" | "R7A"
  modelLabel:    string        // "DAMAS" | "LABO"
}

export interface GCAImportMeta {
  dateFrom:   string   // "2026-05-20"
  dateTo:     string
  shiftFrom:  string   // "E"
  shiftTo:    string   // "N"
  models:     string[] // ["R7", "R7A"]
}

export interface GCAParseResult {
  meta:     GCAImportMeta
  rows:     GCAImportRow[]
  skipped:  number
  warnings: string[]
  rawCount: number
  totalWeight: number   // Sum of all gcaWeight values
  vehCount:    number   // Unique VIN count
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(ddmmyyyy: string): string {
  const parts = ddmmyyyy.trim().split('.')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return new Date().toISOString().split('T')[0]
}

/** Excel serial date (e.g. 46162) → "YYYY-MM-DD" */
function excelSerialToDate(serial: number): string {
  // Excel epoch: Dec 30, 1899
  const date = new Date((serial - 25569) * 86400 * 1000)
  return date.toISOString().split('T')[0]
}

/** Parse reporting date — may be Excel serial, string, or Date object */
export function parseReportingDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0]
  if (typeof val === 'number') return excelSerialToDate(val)
  const s = String(val).trim()
  // DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return parseDate(s)
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  // Try native parse
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return new Date().toISOString().split('T')[0]
}

/** Production Team → Shop name */
export function prodTeamToShopGCA(team: string): string {
  if (!team) return 'GA'
  const t = team.toUpperCase()
  if (t.startsWith('PA.') || t === 'PA') return 'PAINT SHOP'
  if (t.startsWith('BO.') || t === 'BO') return 'WELDING'
  if (t.startsWith('PR.') || t === 'PR') return 'PRESS SHOP'
  // GA, SQ, SC, default → GA
  return 'GA'
}

/** VIN → Model Group */
export function vinToModelGroup(vin: string): string {
  if (!vin || vin.length < 7) return ''
  const code = vin.substring(5, 7)
  if (code === '12') return 'R7'
  if (code === '51') return 'R7A'
  return ''
}

export function modelGroupToLabel(mg: string): string {
  if (mg === 'R7')  return 'DAMAS'
  if (mg === 'R7A') return 'LABO'
  return mg
}

/** Parse fault string: "071 Пузырьки Воздуха" → { code, name } */
export function parseFault(raw: string): { faultCode: string; faultName: string } {
  const s = raw.trim()
  const m3 = s.match(/^(\d{3})\.?\s+(.+)$/)
  if (m3) return { faultCode: m3[1], faultName: m3[2] }
  const mL = s.match(/^([A-Za-z])\s+(.+)$/)
  if (mL) return { faultCode: mL[1], faultName: mL[2] }
  return { faultCode: '—', faultName: s }
}

// ─── Filter Row Parser ────────────────────────────────────────────────────────

export function parseGCAFilterRow(filterStr: string): GCAImportMeta {
  const defaults: GCAImportMeta = {
    dateFrom:  new Date().toISOString().split('T')[0],
    dateTo:    new Date().toISOString().split('T')[0],
    shiftFrom: 'E',
    shiftTo:   'N',
    models:    ['R7', 'R7A'],
  }
  if (!filterStr) return defaults

  try {
    const fromMatch  = filterStr.match(/From:\s*([\d.]+)\s*-\s*([A-Z])/i)
    const toMatch    = filterStr.match(/To:\s*([\d.]+)\s*-\s*([A-Z])/i)
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
      if (modelStr.includes('R7A') || modelStr.includes('Labo'))  models.push('R7A')
      if (modelStr.includes('R7')  || modelStr.includes('Damas')) {
        if (!models.includes('R7')) models.unshift('R7')
      }
      if (models.length > 0) defaults.models = models
    }
  } catch { /* use defaults */ }

  return defaults
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseGsipGCA(buffer: Buffer): GCAParseResult {
  const warnings: string[] = []
  let skipped  = 0
  let rawCount = 0

  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Row 3 (index 2) → filter string
  const filterStr = String(raw[2]?.[0] ?? '')
  const meta = parseGCAFilterRow(filterStr)

  // Row 5 (index 4) → headers, Row 6+ (index 5+) → data
  const dataRows = raw.slice(5)

  const rows: GCAImportRow[] = []
  const vins = new Set<string>()
  let totalWeight = 0

  for (const r of dataRows) {
    // Skip empty rows
    if (!r || r.every((c: any) => c === '' || c == null)) { skipped++; continue }

    // Reporting Date (col 0) must exist
    if (!r[0] && r[0] !== 0) { skipped++; continue }

    rawCount++

    const reportingDate = parseReportingDate(r[0])
    const partLv1       = String(r[1]  ?? '').trim()
    const partLv2       = String(r[2]  ?? '').trim()
    const partLv3       = String(r[3]  ?? '').trim()
    const partLv4       = String(r[4]  ?? '').trim()
    const partLv5       = String(r[5]  ?? '').trim()
    const faultRaw      = String(r[6]  ?? '').trim()
    const gcaWeightRaw  = r[7]
    const defectNote    = String(r[8]  ?? '').trim()
    const faultDesc     = String(r[9]  ?? '').trim()
    const zoneDesc      = String(r[10] ?? '').trim()
    const category      = String(r[11] ?? '').trim()
    const prodTeam      = String(r[12] ?? '').trim()
    const seqNo         = String(r[13] ?? '').trim()
    const vin           = String(r[14] ?? '').trim()

    const gcaWeight  = gcaWeightRaw !== '' && gcaWeightRaw != null ? Number(gcaWeightRaw) : 0
    const { faultCode, faultName } = parseFault(faultRaw)
    const shop       = prodTeamToShopGCA(prodTeam)
    const modelGroup = vinToModelGroup(vin)
    const modelLabel = modelGroupToLabel(modelGroup)

    totalWeight += gcaWeight
    if (vin) vins.add(vin)

    rows.push({
      reportingDate,
      partLv1, partLv2, partLv3, partLv4, partLv5,
      faultCode, faultName,
      gcaWeight,
      defectNote, faultDesc, zoneDesc, category,
      prodTeam, shop,
      seqNo, vin,
      modelGroup, modelLabel,
    })
  }

  if (rawCount === 0) {
    warnings.push("Hech qanday GCA ma'lumoti topilmadi. Excel format to'g'riligini tekshiring.")
  }

  return {
    meta,
    rows,
    skipped,
    warnings,
    rawCount,
    totalWeight,
    vehCount: vins.size,
  }
}

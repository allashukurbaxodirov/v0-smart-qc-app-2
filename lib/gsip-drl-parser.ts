/**
 * GSIP DRL Defect Details Excel → SmartQC
 * Sheet: "Direct Run Loss Defect Details"
 *
 * Bu format GCA/DRR Defect Details bilan bir xil tuzilishga ega.
 * Har bir satr = BIR mashinadagi BIR nuqson (raw records)
 * Parser (faultCode, prodTeam, modelGroup, partLv1) bo'yicha aggregate qiladi.
 *
 * Kerakli ustunlar (Row 5 headers, 0-indexed):
 *  0   R/S              – "S" (standard) | "R" (skip)
 *  1   Level 1          – part category
 *  2   Level 2          – sub-category
 *  3   Level 3          – sub-sub-category
 *  4   Level 4          – (nullable)
 *  6   Fault            – "020 Havo qolgan"
 *  7   PONO             – unique vehicle ID
 *  11  Смена            – "E" | "N"
 *  13  Defect Date      – datetime
 *  14  Production Team  – "GA.GA-1"
 *  28  Model Group      – "R7" | "R7A"
 *  43  DRL Ratio        – e.g. 1
 *  50  FAULT_ID
 *  54  BPD_FULL_CD      – "00.GA.GA-1"
 */

import * as XLSX from 'xlsx'
import { prodTeamToShop, prodTeamToRole, modelGroupToLabel } from './gsip-pareto-parser'
import type { ShiftCalendar } from './gsip-drr-parser'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DRLDetailRow {
  rowType:    string
  modelGroup: string
  modelLabel: string
  partLv1:    string
  partLv2:    string
  partLv3:    string
  partLv4:    string
  faultId:    number | null
  faultCode:  string
  faultName:  string
  prodTeam:   string
  shop:       string
  count:      number    // aggregate count
  drlRatio:   number    // sum of DRL ratios (or just count, since ratio = 1 per defect)
  vehCnt:     number    // unique PONO count
  defectDate: string | null  // aniq kun (oylik import uchun)
}

export interface DRLDetailMeta {
  dateFrom:   string   // "2026-04-01"
  dateTo:     string
  shiftFrom:  string   // "E"
  shiftTo:    string   // "N"
  models:     string[] // ["R7", "R7A"]
}

export interface DRLDetailTop10 {
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
  assignedRole: string
}

export interface DRLDetailParseResult {
  meta:     DRLDetailMeta
  rows:     DRLDetailRow[]
  top10:    DRLDetailTop10[]
  skipped:  number
  warnings: string[]
  rawCount: number
}

// ─── Filter Row Parser ────────────────────────────────────────────────────────

function parseDate(ddmmyyyy: string): string {
  const parts = ddmmyyyy.trim().split('.')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return new Date().toISOString().split('T')[0]
}

function parseFilterRow(filterStr: string): DRLDetailMeta {
  const defaults: DRLDetailMeta = {
    dateFrom:  new Date().toISOString().split('T')[0],
    dateTo:    new Date().toISOString().split('T')[0],
    shiftFrom: 'E',
    shiftTo:   'N',
    models:    ['R7', 'R7A'],
  }
  if (!filterStr) return defaults

  try {
    const fromMatch  = filterStr.match(/From:\s*([\d.]+)\s*-\s*([A-Z])/i)
    const fromMatch2 = filterStr.match(/From:\s*([\d.]+)/i)
    const toMatch    = filterStr.match(/To:\s*([\d.]+)\s*-\s*([A-Z])/i)
    const toMatch2   = filterStr.match(/To:\s*([\d.]+)/i)
    const modelMatch = filterStr.match(/Model Group:\s*([^,\n]+(?:,[^,\n]+)*?)(?:,\s*Metric|$)/i)

    if (fromMatch) {
      defaults.dateFrom  = parseDate(fromMatch[1])
      defaults.shiftFrom = fromMatch[2].toUpperCase()
    } else if (fromMatch2) {
      defaults.dateFrom  = parseDate(fromMatch2[1])
      defaults.shiftFrom = 'E'
    }
    if (toMatch) {
      defaults.dateTo  = parseDate(toMatch[1])
      defaults.shiftTo = toMatch[2].toUpperCase()
    } else if (toMatch2) {
      defaults.dateTo  = parseDate(toMatch2[1])
      defaults.shiftTo = 'N'
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

export function parseGsipDRL(buffer: Buffer): DRLDetailParseResult {
  const warnings: string[] = []
  let skipped  = 0
  let rawCount = 0

  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Row 3 (index 2) → filter string
  const filterStr = String(raw[2]?.[0] ?? '')
  const meta = parseFilterRow(filterStr)

  // Row 5 (index 4) → headers, Row 6+ (index 5+) → data
  const dataRows = raw.slice(5)

  // ── Aggregate map ──────────────────────────────────────────────────────────
  interface AggEntry {
    rowType:    string
    modelGroup: string
    modelLabel: string
    partLv1:    string
    partLv2:    string
    partLv3:    string
    partLv4:    string
    faultId:    number | null
    faultCode:  string
    faultName:  string
    prodTeam:   string
    shop:       string
    count:      number
    drlRatioSum: number
    ponos:      Set<string>
  }

  const aggMap: Record<string, AggEntry> = {}

  for (const r of dataRows) {
    if (!r || !r[0]) { skipped++; continue }

    const rowType = String(r[0] ?? '').trim().toUpperCase()
    if (rowType !== 'S') { skipped++; continue }

    rawCount++

    const partLv1      = String(r[1]  ?? '').trim()
    const partLv2      = String(r[2]  ?? '').trim()
    const partLv3      = String(r[3]  ?? '').trim()
    const partLv4      = String(r[4]  ?? '').trim()
    const faultRaw     = String(r[6]  ?? '').trim()
    const pono         = String(r[7]  ?? '').trim()
    const prodTeamShort = String(r[14] ?? '').trim()   // "GA.GA-1"
    const modelGroup   = String(r[28] ?? '').trim()   // "R7" / "R7A"
    const drlRatioRaw  = r[43]
    const faultIdRaw   = r[50]
    const bpdFull      = String(r[54] ?? '').trim()   // "00.GA.GA-1"

    if (!faultRaw) { skipped++; continue }

    const prodTeam = bpdFull || ('00.' + prodTeamShort)
    const shop     = prodTeamToShop(prodTeam)

    // Parse fault: "020 Havo qolgan" → code="020", name="Havo qolgan"
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

    const _faultIdNum = Number(faultIdRaw)
    const faultId = (faultIdRaw !== '' && faultIdRaw != null && !isNaN(_faultIdNum)) ? _faultIdNum : null

    const drlRatio = (drlRatioRaw !== '' && drlRatioRaw != null && !isNaN(Number(drlRatioRaw)))
      ? Number(drlRatioRaw) : 1

    const key = `${faultCode}||${faultName}||${prodTeam}||${modelGroup}||${partLv1}`

    if (!aggMap[key]) {
      aggMap[key] = {
        rowType, modelGroup,
        modelLabel: modelGroupToLabel(modelGroup),
        partLv1, partLv2, partLv3, partLv4,
        faultId, faultCode, faultName,
        prodTeam, shop,
        count: 0,
        drlRatioSum: 0,
        ponos: new Set(),
      }
    }

    const agg = aggMap[key]
    agg.count += 1
    agg.drlRatioSum += drlRatio
    if (pono) agg.ponos.add(pono)
  }

  // AggEntry → DRLDetailRow
  const rows: DRLDetailRow[] = Object.values(aggMap).map(agg => ({
    rowType:    agg.rowType,
    modelGroup: agg.modelGroup,
    modelLabel: agg.modelLabel,
    partLv1:    agg.partLv1,
    partLv2:    agg.partLv2,
    partLv3:    agg.partLv3,
    partLv4:    agg.partLv4,
    faultId:    agg.faultId,
    faultCode:  agg.faultCode,
    faultName:  agg.faultName,
    prodTeam:   agg.prodTeam,
    shop:       agg.shop,
    count:      agg.count,
    drlRatio:   Math.round(agg.drlRatioSum * 10) / 10,
    vehCnt:     agg.ponos.size,
    defectDate: null,
  }))

  // ── Top 10 ────────────────────────────────────────────────────────────────
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
    const f = faultMap[key]
    f.totalCount  += row.count
    f.drlRatioSum += row.drlRatio
    f.teams[row.prodTeam]    = (f.teams[row.prodTeam]    || 0) + row.count
    f.models[row.modelGroup] = (f.models[row.modelGroup] || 0) + row.count
    f.lv1s[row.partLv1]     = (f.lv1s[row.partLv1]     || 0) + row.count
  }

  const top10: DRLDetailTop10[] = Object.entries(faultMap)
    .sort((a, b) => b[1].totalCount - a[1].totalCount)
    .slice(0, 10)
    .map(([key, f], idx) => {
      const [faultCode, faultName] = key.split('||')
      const topTeam = Object.entries(f.teams).sort((a, b) => b[1] - a[1])[0]
      const topLv1  = Object.entries(f.lv1s).sort((a, b)  => b[1] - a[1])[0]
      return {
        rank:         idx + 1,
        faultCode,
        faultName,
        totalCount:   f.totalCount,
        drlRatioSum:  Math.round(f.drlRatioSum * 10) / 10,
        topShop:      prodTeamToShop(topTeam?.[0] ?? ''),
        topProdTeam:  topTeam?.[0] ?? '',
        modelDamas:   f.models['R7']  ?? 0,
        modelLabo:    f.models['R7A'] ?? 0,
        topPartLv1:   topLv1?.[0] ?? '',
        assignedRole: prodTeamToRole(topTeam?.[0] ?? ''),
      }
    })

  if (rawCount === 0) {
    warnings.push('Hech qanday DRL ma\'lumoti topilmadi. Excel format to\'g\'riligini tekshiring.')
  }

  return { meta, rows, top10, skipped, warnings, rawCount }
}

// ─── By-Smena (Oylik) Parser ──────────────────────────────────────────────────

function drlToDateStr(v: any): string {
  if (v == null || v === '') return ''
  if (typeof v === 'number') {
    const d = new Date((v - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]
  }
  if (v instanceof Date) return v.toISOString().split('T')[0]
  const s = String(v).trim()
  if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) {
    const p = s.substring(0, 10).split('.')
    return `${p[2]}-${p[1]}-${p[0]}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
}

export interface DRLBySmenaResult {
  meta:         DRLDetailMeta
  bySmena:      Record<string, { rows: DRLDetailRow[]; rawCount: number; skipped: number }>
  warnings:     string[]
  totalRaw:     number
  totalSkipped: number
}

export function parseGsipDRLBySmena(buffer: Buffer, calendar: ShiftCalendar): DRLBySmenaResult {
  const warnings: string[] = []
  let totalSkipped = 0
  let totalRaw     = 0

  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const filterStr = String(raw[2]?.[0] ?? '')
  const meta = parseFilterRow(filterStr)

  const dataRows = raw.slice(5)

  // bySmena aggregate maps: smena → { key → AggEntry }
  interface AggEntry {
    rowType: string; modelGroup: string; modelLabel: string
    partLv1: string; partLv2: string; partLv3: string; partLv4: string
    faultId: number | null; faultCode: string; faultName: string
    prodTeam: string; shop: string
    count: number; drlRatioSum: number; ponos: Set<string>
    defectDate: string
  }
  const smenaAgg: Record<string, Record<string, AggEntry>> = {}
  const smenaRaw: Record<string, number> = {}
  const smenaSkip: Record<string, number> = {}

  for (const r of dataRows) {
    if (!r || !r[0]) { totalSkipped++; continue }
    const rowType = String(r[0] ?? '').trim().toUpperCase()
    if (rowType !== 'S') { totalSkipped++; continue }

    totalRaw++

    const dateStr  = drlToDateStr(r[13])   // col 13 = Defect Date
    const rawShift = String(r[11] ?? '').trim().toUpperCase()  // col 11 = E/N

    const smena = (calendar[dateStr]?.[rawShift as 'E' | 'N']) ?? null
    if (!smena || smena === '—') { totalSkipped++; continue }

    if (!smenaAgg[smena])  { smenaAgg[smena]  = {}; smenaRaw[smena] = 0; smenaSkip[smena] = 0 }
    smenaRaw[smena]++

    const partLv1       = String(r[1]  ?? '').trim()
    const partLv2       = String(r[2]  ?? '').trim()
    const partLv3       = String(r[3]  ?? '').trim()
    const partLv4       = String(r[4]  ?? '').trim()
    const faultRaw      = String(r[6]  ?? '').trim()
    const pono          = String(r[7]  ?? '').trim()
    const prodTeamShort = String(r[14] ?? '').trim()
    const modelGroup    = String(r[28] ?? '').trim()
    const drlRatioRaw   = r[43]
    const faultIdRaw    = r[50]
    const bpdFull       = String(r[54] ?? '').trim()

    if (!faultRaw) { smenaSkip[smena]++; continue }

    const prodTeam = bpdFull || ('00.' + prodTeamShort)
    const shop     = prodTeamToShop(prodTeam)

    let faultCode: string, faultName: string
    const m3 = faultRaw.match(/^(\d{3})\.?\s+(.+)$/)
    const mL = faultRaw.match(/^([A-Za-z])\s+(.+)$/)
    if (m3) { faultCode = m3[1]; faultName = m3[2] }
    else if (mL) { faultCode = mL[1]; faultName = mL[2] }
    else { faultCode = '—'; faultName = faultRaw }

    const faultId  = (faultIdRaw !== '' && faultIdRaw != null && !isNaN(Number(faultIdRaw))) ? Number(faultIdRaw) : null
    const drlRatio = (drlRatioRaw !== '' && drlRatioRaw != null && !isNaN(Number(drlRatioRaw))) ? Number(drlRatioRaw) : 1

    const key = `${dateStr}||${faultCode}||${faultName}||${prodTeam}||${modelGroup}||${partLv1}`

    if (!smenaAgg[smena][key]) {
      smenaAgg[smena][key] = {
        rowType, modelGroup, modelLabel: modelGroupToLabel(modelGroup),
        partLv1, partLv2, partLv3, partLv4,
        faultId, faultCode, faultName, prodTeam, shop,
        count: 0, drlRatioSum: 0, ponos: new Set(),
        defectDate: dateStr,
      }
    }
    const agg = smenaAgg[smena][key]
    agg.count += 1
    agg.drlRatioSum += drlRatio
    if (pono) agg.ponos.add(pono)
  }

  const bySmena: DRLBySmenaResult['bySmena'] = {}
  for (const [smena, aggMap] of Object.entries(smenaAgg)) {
    const rows: DRLDetailRow[] = Object.values(aggMap).map(agg => ({
      rowType: agg.rowType, modelGroup: agg.modelGroup, modelLabel: agg.modelLabel,
      partLv1: agg.partLv1, partLv2: agg.partLv2, partLv3: agg.partLv3, partLv4: agg.partLv4,
      faultId: agg.faultId, faultCode: agg.faultCode, faultName: agg.faultName,
      prodTeam: agg.prodTeam, shop: agg.shop,
      count: agg.count, drlRatio: Math.round(agg.drlRatioSum * 10) / 10,
      vehCnt: agg.ponos.size, defectDate: agg.defectDate,
    }))
    bySmena[smena] = { rows, rawCount: smenaRaw[smena] ?? 0, skipped: smenaSkip[smena] ?? 0 }
  }

  if (totalRaw === 0) warnings.push('Smena jadvali mos kelmadi yoki faylda DRL ma\'lumoti topilmadi.')

  return { meta, bySmena, warnings, totalRaw, totalSkipped }
}

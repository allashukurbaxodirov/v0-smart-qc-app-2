/**
 * GSIP DRR Defect Details Excel → SmartQC
 * Sheet: "Direct Run Ratio Defect Details"
 *
 * DRR = Daily Rejection Rate — har bir mashina ustidagi qayd etilgan nuqsonlar
 * Har bir satr = BIR mashinadagi BIR nuqson (raw records)
 * Parser ularni fault_code + prodTeam + modelGroup + partLv1 bo'yicha aggregate qiladi
 *
 * OQ (kerak) ustunlar — Row 4 headers:
 *  0   R/S              – "S" (standard) | "R" (skip)
 *  1   Level 1          – part category  (e.g. "Interior", "Body Surface")
 *  2   Level 2          – sub-category
 *  3   Level 3          – sub-sub category
 *  4   Level 4          – (nullable)
 *  ✗5  Level 5          – SARIQ, skip
 *  6   Fault            – "033 Брак работоспособности"
 *  7   PONO             – ish buyurtma raqami (unique vehicle identifier)
 *  9   Defect Note      – nuqson tavsifi (uz/ru)
 *  10  Shift Start      – Excel serial date (46162 = 2026-05-20)
 *  11  Смена            – shift: "E" | "N" | "A"
 *  12  Crew             – smena brigadasi: "D" | "A" | "B"
 *  13  Defect Date      – nuqson qayd etilgan sana+vaqt
 *  14  Production Team  – qisqa: "GA.GA-1", "BO.HAPO"
 *  28  Model Group      – "R7" → DAMAS | "R7A" → LABO
 *  ✗43 DRL Ratio        – SARIQ, skip
 *  50  FAULT_ID         – raqamli ID
 *  54  BPD_FULL_CD      – to'liq: "00.GA.GA-1" → seh mapping uchun
 */

import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DRRImportRow {
  rowType:     string
  modelGroup:  string
  modelLabel:  string
  partLv1:     string
  partLv2:     string
  partLv3:     string
  partLv4:     string
  faultId:     number | null
  faultCode:   string
  faultName:   string
  defectNote:  string        // Defect Note (col 9) — nuqson tavsifi
  crew:        string        // Crew (col 12) — smena brigadasi
  prodTeam:    string        // BPD_FULL_CD: "00.GA.GA-1"
  shop:        string        // "GA" / "WELDING" / "PAINT SHOP" / "PRESS SHOP"
  count:       number        // aggregate count (nechta raw record)
  drrRatio:    number        // 0 (DRL Ratio sariq — ishlatilmaydi)
  vehCnt:      number        // unique PONO soni (unique mashina soni)
}

export interface DRRImportMeta {
  dateFrom:   string   // "2026-05-20"
  dateTo:     string
  shiftFrom:  string   // "E"
  shiftTo:    string   // "N"
  models:     string[] // ["R7", "R7A"]
}

export interface DRRTop10Fault {
  rank:        number
  faultCode:   string
  faultName:   string
  totalCount:  number
  totalVehCnt: number   // unique mashina soni
  topShop:     string
  topProdTeam: string
  modelDamas:  number
  modelLabo:   number
  topPartLv1:  string
  assignedRole: string
}

export interface DRRParseResult {
  meta:     DRRImportMeta
  rows:     DRRImportRow[]
  top10:    DRRTop10Fault[]
  skipped:  number
  warnings: string[]
  rawCount: number    // aggregate qilinishidan oldingi jami raw yozuvlar
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

/** BPD_FULL_CD (col 54) yoki qisqa forma (col 14) → SmartQC Shop */
export function prodTeamToShopDRR(team: string): string {
  if (!team) return 'UNKNOWN'
  const t = team.toUpperCase()
  if (t.startsWith('00.BO') || t.startsWith('BO')) return 'WELDING'
  if (t.startsWith('00.PA') || t.startsWith('PA')) return 'PAINT SHOP'
  if (t.startsWith('00.GA') || t.startsWith('GA') ||
      t.startsWith('00.SQ') || t.startsWith('SQ') ||
      t.startsWith('00.SC')) return 'GA'
  if (t.startsWith('00.PR') || t.startsWith('PR')) return 'PRESS SHOP'
  return 'GA'
}

export function prodTeamToRoleDRR(team: string): string {
  if (!team) return 'ga_engineer'
  const t = team.toUpperCase()
  if (t.startsWith('00.BO') || t.startsWith('BO')) return 'welding_engineer'
  return 'ga_engineer'
}

export function modelGroupToLabelDRR(mg: string): string {
  if (mg === 'R7')  return 'DAMAS'
  if (mg === 'R7A') return 'LABO'
  return mg
}

// ─── Filter Row Parser (Row 2) ─────────────────────────────────────────────────
// "Filter By: From: 20.05.2026 - E, To: 20.05.2026 - N, Model Group: R7 - Damas 85,R7 - Labo 80, Metric: DRR - All"

function parseDate(ddmmyyyy: string): string {
  const parts = ddmmyyyy.trim().split('.')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return new Date().toISOString().split('T')[0]
}

export function parseDRRFilterRow(filterStr: string): DRRImportMeta {
  const defaults: DRRImportMeta = {
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
      if (modelStr.includes('R7A') || modelStr.includes('Labo')) models.push('R7A')
      if (modelStr.includes('R7')  || modelStr.includes('Damas')) {
        if (!models.includes('R7')) models.unshift('R7')
      }
      if (models.length > 0) defaults.models = models
    }
  } catch { /* use defaults */ }

  return defaults
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseGsipDRR(buffer: Buffer): DRRParseResult {
  const warnings: string[] = []
  let skipped  = 0
  let rawCount = 0

  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Row 2 (index 2) → filter string: sana, smena, model
  const filterStr = String(raw[2]?.[0] ?? '')
  const meta = parseDRRFilterRow(filterStr)

  // Row 4 → headers, Row 5+ → raw defect records
  const dataRows = raw.slice(5)

  // ── Aggregate map ──────────────────────────────────────────────────────────
  // Key: faultCode || faultName || prodTeam || modelGroup || partLv1
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
    defectNote: string        // birinchi uchraganini saqlaymiz
    crew:       string
    prodTeam:   string
    shop:       string
    count:      number
    ponos:      Set<string>   // unique PONO → unique mashina soni
  }

  const aggMap: Record<string, AggEntry> = {}

  for (const r of dataRows) {
    if (!r || !r[0]) { skipped++; continue }

    const rowType = String(r[0] ?? '').trim().toUpperCase()
    if (rowType !== 'S') { skipped++; continue }

    rawCount++

    // ── Kerakli ustunlarni olish ─────────────────────────────────────────
    const partLv1    = String(r[1]  ?? '').trim()
    const partLv2    = String(r[2]  ?? '').trim()
    const partLv3    = String(r[3]  ?? '').trim()
    const partLv4    = String(r[4]  ?? '').trim()
    // col 5 = Level 5 → SARIQ, skip
    const faultRaw   = String(r[6]  ?? '').trim()
    const pono       = String(r[7]  ?? '').trim()   // PONO → unique mashina
    // col 8 = Orig. Input Stn. → SARIQ, skip
    const defectNote = String(r[9]  ?? '').trim()   // Defect Note
    // col 10 = Shift Start → meta da ishlatilgan
    // col 11 = Смена → meta da ishlatilgan
    const crew       = String(r[12] ?? '').trim()   // Crew
    // col 13 = Defect Date → skip (meta da bor)
    const prodTeamShort = String(r[14] ?? '').trim() // "GA.GA-1", "BO.HAPO"
    // col 15-27 → SARIQ, skip
    const modelGroup = String(r[28] ?? '').trim()   // "R7" / "R7A"
    // col 29-45 → SARIQ, skip
    // col 43 = DRL Ratio → SARIQ, drrRatio = 0
    const faultIdRaw = r[50]                        // FAULT_ID
    const bpdFull    = String(r[54] ?? '').trim()   // BPD_FULL_CD: "00.GA.GA-1"

    if (!faultRaw) { skipped++; continue }

    // BPD_FULL_CD (col 54) — asosiy; fallback: "00." + qisqa forma (col 14)
    const prodTeam = bpdFull || ('00.' + prodTeamShort)
    const shop     = prodTeamToShopDRR(prodTeam)

    // Fault parse: "033 Брак работоспособности" → code="033", name="Брак..."
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

    // Aggregate key
    const key = `${faultCode}||${faultName}||${prodTeam}||${modelGroup}||${partLv1}`

    if (!aggMap[key]) {
      aggMap[key] = {
        rowType, modelGroup,
        modelLabel: modelGroupToLabelDRR(modelGroup),
        partLv1, partLv2, partLv3, partLv4,
        faultId, faultCode, faultName,
        defectNote,    // birinchi uchraganini saqlaymiz
        crew,
        prodTeam, shop,
        count: 0,
        ponos: new Set(),
      }
    }

    const agg = aggMap[key]
    agg.count += 1
    if (pono) agg.ponos.add(pono)
    // defectNote va crew: birinchi qiymat qoladi (allaqachon set qilingan)
  }

  // AggEntry → DRRImportRow
  const rows: DRRImportRow[] = Object.values(aggMap).map(agg => ({
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
    defectNote: agg.defectNote,
    crew:       agg.crew,
    prodTeam:   agg.prodTeam,
    shop:       agg.shop,
    count:      agg.count,
    drrRatio:   0,              // DRL Ratio sariq — 0 saqlanadi
    vehCnt:     agg.ponos.size, // unique PONO soni
  }))

  // ── Top 10 (fault_code bo'yicha barcha grouplarni birlashtirish) ──────────
  interface FaultAgg {
    totalCount:  number
    totalVehCnt: number
    teams:  Record<string, number>
    models: Record<string, number>
    lv1s:   Record<string, number>
  }
  const faultMap: Record<string, FaultAgg> = {}

  for (const row of rows) {
    const key = `${row.faultCode}||${row.faultName}`
    if (!faultMap[key]) {
      faultMap[key] = { totalCount: 0, totalVehCnt: 0, teams: {}, models: {}, lv1s: {} }
    }
    const f = faultMap[key]
    f.totalCount  += row.count
    f.totalVehCnt += row.vehCnt
    f.teams[row.prodTeam]    = (f.teams[row.prodTeam]    || 0) + row.count
    f.models[row.modelGroup] = (f.models[row.modelGroup] || 0) + row.count
    f.lv1s[row.partLv1]     = (f.lv1s[row.partLv1]     || 0) + row.count
  }

  const top10: DRRTop10Fault[] = Object.entries(faultMap)
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
        totalVehCnt:  f.totalVehCnt,
        topShop:      prodTeamToShopDRR(topTeam?.[0] ?? ''),
        topProdTeam:  topTeam?.[0] ?? '',
        modelDamas:   f.models['R7']  ?? 0,
        modelLabo:    f.models['R7A'] ?? 0,
        topPartLv1:   topLv1?.[0] ?? '',
        assignedRole: prodTeamToRoleDRR(topTeam?.[0] ?? ''),
      }
    })

  if (rawCount === 0) {
    warnings.push('Hech qanday nuqson ma\'lumoti topilmadi. Excel format to\'g\'riligini tekshiring.')
  }

  return { meta, rows, top10, skipped, warnings, rawCount }
}

// ─── Monthly (oylik) parser — smena bo'yicha ajratadi ─────────────────────────
// shiftCalendar: { "2026-05-01": { E: "A", N: "B" }, ... }
// E = kunduz (erta), N = tungi shift
// Qiymat: "A" | "B" | "D" | undefined (undefined = tayinlanmagan, skip)

export type ShiftCalendar = Record<string, { E?: string; N?: string }>

function toDateStr(v: any): string {
  if (!v && v !== 0) return ''
  if (v instanceof Date) return v.toISOString().split('T')[0]
  if (typeof v === 'number') {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().split('T')[0]
  }
  return String(v).substring(0, 10)
}

export interface DRRBySmenaResult {
  meta:    DRRImportMeta
  bySmena: Record<string, {
    rows:     DRRImportRow[]
    top10:    DRRTop10Fault[]
    rawCount: number
    skipped:  number
  }>
  warnings:    string[]
  totalRaw:    number
  totalSkipped: number
}

export function parseGsipDRRBySmena(
  buffer: Buffer,
  calendar: ShiftCalendar,
): DRRBySmenaResult {
  const warnings: string[] = []
  let totalSkipped = 0
  let totalRaw = 0

  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const filterStr = String(raw[2]?.[0] ?? '')
  const meta = parseDRRFilterRow(filterStr)

  const dataRows = raw.slice(5)

  // smena → aggMap
  const smenaMaps: Record<string, Record<string, {
    rowType: string; modelGroup: string; modelLabel: string
    partLv1: string; partLv2: string; partLv3: string; partLv4: string
    faultId: number | null; faultCode: string; faultName: string
    defectNote: string; crew: string; prodTeam: string; shop: string
    count: number; ponos: Set<string>
  }>> = {}

  for (const r of dataRows) {
    if (!r || !r[0]) { totalSkipped++; continue }
    const rowType = String(r[0]).trim().toUpperCase()
    if (rowType !== 'S') { totalSkipped++; continue }

    // Sana va shift aniqlash
    const dateStr   = toDateStr(r[10])
    const gsipShift = String(r[11] ?? '').trim().toUpperCase()  // E | N
    const smena     = dateStr && gsipShift
      ? (calendar[dateStr]?.[gsipShift as 'E' | 'N'] ?? null)
      : null

    if (!smena) { totalSkipped++; continue }

    totalRaw++

    const partLv1       = String(r[1]  ?? '').trim()
    const partLv2       = String(r[2]  ?? '').trim()
    const partLv3       = String(r[3]  ?? '').trim()
    const partLv4       = String(r[4]  ?? '').trim()
    const faultRaw      = String(r[6]  ?? '').trim()
    const pono          = String(r[7]  ?? '').trim()
    const defectNote    = String(r[9]  ?? '').trim()
    const crew          = String(r[12] ?? '').trim()
    const prodTeamShort = String(r[14] ?? '').trim()
    const modelGroup    = String(r[28] ?? '').trim()
    const faultIdRaw    = r[50]
    const bpdFull       = String(r[54] ?? '').trim()

    if (!faultRaw) { totalSkipped++; continue }

    const prodTeam = bpdFull || ('00.' + prodTeamShort)
    const shop     = prodTeamToShopDRR(prodTeam)

    let faultCode: string, faultName: string
    const m3 = faultRaw.match(/^(\d{3})\.?\s+(.+)$/)
    const mL  = faultRaw.match(/^([A-Za-z])\s+(.+)$/)
    if (m3)      { faultCode = m3[1]; faultName = m3[2] }
    else if (mL) { faultCode = mL[1]; faultName = mL[2] }
    else         { faultCode = '—';   faultName = faultRaw }

    const faultIdNum = Number(faultIdRaw)
    const faultId = (faultIdRaw !== '' && faultIdRaw != null && !isNaN(faultIdNum)) ? faultIdNum : null

    if (!smenaMaps[smena]) smenaMaps[smena] = {}
    const aggMap = smenaMaps[smena]
    const key    = `${faultCode}||${faultName}||${prodTeam}||${modelGroup}||${partLv1}`

    if (!aggMap[key]) {
      aggMap[key] = {
        rowType, modelGroup, modelLabel: modelGroupToLabelDRR(modelGroup),
        partLv1, partLv2, partLv3, partLv4, faultId,
        faultCode, faultName, defectNote, crew, prodTeam, shop,
        count: 0, ponos: new Set(),
      }
    }
    aggMap[key].count++
    if (pono) aggMap[key].ponos.add(pono)
  }

  // AggMap → rows + top10 per smena
  const bySmena: DRRBySmenaResult['bySmena'] = {}

  for (const [smena, aggMap] of Object.entries(smenaMaps)) {
    const rows: DRRImportRow[] = Object.values(aggMap).map(a => ({
      rowType: a.rowType, modelGroup: a.modelGroup, modelLabel: a.modelLabel,
      partLv1: a.partLv1, partLv2: a.partLv2, partLv3: a.partLv3, partLv4: a.partLv4,
      faultId: a.faultId, faultCode: a.faultCode, faultName: a.faultName,
      defectNote: a.defectNote, crew: a.crew, prodTeam: a.prodTeam, shop: a.shop,
      count: a.count, drrRatio: 0, vehCnt: a.ponos.size,
    }))

    // Top10
    const faultMap: Record<string, {
      totalCount: number; totalVehCnt: number
      teams: Record<string, number>; models: Record<string, number>; lv1s: Record<string, number>
    }> = {}
    for (const row of rows) {
      const k = `${row.faultCode}||${row.faultName}`
      if (!faultMap[k]) faultMap[k] = { totalCount: 0, totalVehCnt: 0, teams: {}, models: {}, lv1s: {} }
      const f = faultMap[k]
      f.totalCount  += row.count
      f.totalVehCnt += row.vehCnt
      f.teams[row.prodTeam]    = (f.teams[row.prodTeam]    || 0) + row.count
      f.models[row.modelGroup] = (f.models[row.modelGroup] || 0) + row.count
      f.lv1s[row.partLv1]     = (f.lv1s[row.partLv1]     || 0) + row.count
    }
    const top10: DRRTop10Fault[] = Object.entries(faultMap)
      .sort((a, b) => b[1].totalCount - a[1].totalCount)
      .slice(0, 10)
      .map(([k, f], idx) => {
        const [fc, fn] = k.split('||')
        const topTeam = Object.entries(f.teams).sort((a, b) => b[1] - a[1])[0]
        const topLv1  = Object.entries(f.lv1s).sort((a, b)  => b[1] - a[1])[0]
        return {
          rank: idx + 1, faultCode: fc, faultName: fn,
          totalCount: f.totalCount, totalVehCnt: f.totalVehCnt,
          topShop: prodTeamToShopDRR(topTeam?.[0] ?? ''),
          topProdTeam: topTeam?.[0] ?? '',
          modelDamas: f.models['R7'] ?? 0, modelLabo: f.models['R7A'] ?? 0,
          topPartLv1: topLv1?.[0] ?? '',
          assignedRole: prodTeamToRoleDRR(topTeam?.[0] ?? ''),
        }
      })

    const rawCount = Object.values(aggMap).reduce((s, a) => s + a.count, 0)
    bySmena[smena] = { rows, top10, rawCount, skipped: 0 }
  }

  if (totalRaw === 0) {
    warnings.push('Smena jadvali mos kelmadi yoki ma\'lumot topilmadi.')
  }

  return { meta, bySmena, warnings, totalRaw, totalSkipped }
}

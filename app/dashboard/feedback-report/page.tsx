'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/dashboard/page-header'
import { useGCA } from '@/lib/gca-context'
import { useQRecords } from '@/lib/qrecords-context'
import { useDRecords } from '@/lib/d-records-context'
import { Download, FileText, Loader2, Eye, EyeOff, Presentation } from 'lucide-react'

// Resolution map type (from /api/resolutions)
interface ResolutionEntry {
  status:             string
  problemDescription: string
  rootCause:          string
  immediateAction:    string
  mainAction:         string
  decision:           string
  transferTarget:     string
  transferReason:     string
  resolvedAt:         string | null
  createdByName:      string | null
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface SlideData {
  id:             string
  shop:           string
  sector:         string | null
  pono:           string | null
  defectCode:     string
  defectName:     string
  factor:         number
  count:          number
  date:           string
  operatorNotes:  string | null
  photoBefore:    string | null
  cause:          string | null
  action:         string | null
  brakePoint:     string | null
  photoAfter:     string | null
  isResolved:     boolean
  resolvedByName: string | null
  resolvedAt:     string | null
  source:         string
}

// ─── Constants ───────────────────────────────────────────────────────────────
const SHOP_COLORS: Record<string, string> = {
  'PRESS SHOP': '1E40AF',
  'WELDING-1':  'B91C1C',
  'WELDING-2':  'B91C1C',
  'PAINT SHOP': '166534',
  'GA':         '92400E',
}

const FACTOR_INFO: Record<number, { color: string; label: string; badge: string }> = {
  50: { color: 'DC2626', label: 'Kritik',    badge: 'bg-red-100 text-red-700'    },
  20: { color: 'D97706', label: "O'rtacha",  badge: 'bg-amber-100 text-amber-700' },
  10: { color: '2563EB', label: 'Past',      badge: 'bg-blue-100 text-blue-700'  },
  5:  { color: '16A34A', label: 'Minimal',   badge: 'bg-green-100 text-green-700' },
}

// ─── Slide dimensions (inches) — LAYOUT_WIDE ─────────────────────────────────
// Total: 13.33 × 7.5 inches
const W  = 13.33
const H  = 7.5

// Header
const HDR_Y = 0
const HDR_H = 0.52

// Body
const BODY_Y = HDR_H + 0.02
const FOOT_H = 0.32
const BODY_H = H - BODY_Y - FOOT_H

// Left column (FEEDBACK)
const L_X = 0
const L_W = 5.1
const L_PAD = 0.14

// Divider
const DIV_X = L_W
const DIV_W = 0.05

// Right column (ACTION)
const R_X = DIV_X + DIV_W
const R_W = W - R_X
const R_PAD = 0.14

// ─── PPTX builder ────────────────────────────────────────────────────────────
async function buildPPTX(slides: SlideData[], fileName: string) {
  const PptxGenJS = (await import('pptxgenjs')).default
  const prs = new PptxGenJS()

  prs.layout  = 'LAYOUT_WIDE'
  prs.author  = 'UzAuto Motors QC'
  prs.company = 'UzAuto Motors'
  prs.title   = 'Quality Feedback Report'

  for (let si = 0; si < slides.length; si++) {
    const s  = slides[si]
    const sl = prs.addSlide()

    const shopHex   = SHOP_COLORS[s.shop] ?? '374151'
    const fi        = FACTOR_INFO[s.factor] ?? { color: '6B7280', label: `F${s.factor}` }
    const resolvedHex = s.isResolved ? '15803D' : 'B45309'

    // ── Background ────────────────────────────────────────────────────────
    sl.background = { color: 'FFFFFF' }

    // ══════════════════════ HEADER ══════════════════════════════════════
    // QUALITY block (dark navy)
    sl.addShape('rect' as any, {
      x: 0, y: HDR_Y, w: 1.55, h: HDR_H,
      fill: { color: '1E3A5F' }, line: { color: '1E3A5F' },
    })
    sl.addText('QUALITY', {
      x: 0, y: HDR_Y, w: 1.55, h: HDR_H,
      fontSize: 13, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', charSpacing: 2.5,
    })

    // FEEDBACK arrow label
    sl.addShape('rect' as any, {
      x: 1.55, y: HDR_Y, w: 1.45, h: HDR_H,
      fill: { color: '1D4ED8' }, line: { color: '1D4ED8' },
    })
    sl.addText('FEEDBACK', {
      x: 1.55, y: HDR_Y, w: 1.45, h: HDR_H,
      fontSize: 10, bold: true, color: 'BFDBFE',
      align: 'center', valign: 'middle', charSpacing: 1,
    })

    // Shop label (center)
    sl.addShape('rect' as any, {
      x: 3.0, y: HDR_Y, w: 7.38, h: HDR_H,
      fill: { color: shopHex }, line: { color: shopHex },
    })
    sl.addText(s.shop, {
      x: 3.0, y: HDR_Y, w: 3.8, h: HDR_H,
      fontSize: 15, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', charSpacing: 3,
    })
    sl.addText('QUALITY FEEDBACK REPORT', {
      x: 6.8, y: HDR_Y, w: 3.58, h: HDR_H / 2,
      fontSize: 7.5, bold: true, color: 'E0F2FE',
      align: 'center', valign: 'bottom',
    })
    sl.addText(s.date + '  ·  ' + s.source, {
      x: 6.8, y: HDR_Y + HDR_H / 2, w: 3.58, h: HDR_H / 2,
      fontSize: 7, color: 'BAE6FD',
      align: 'center', valign: 'top',
    })

    // ACTION arrow label
    sl.addShape('rect' as any, {
      x: 10.38, y: HDR_Y, w: 1.45, h: HDR_H,
      fill: { color: '15803D' }, line: { color: '15803D' },
    })
    sl.addText('ACTION', {
      x: 10.38, y: HDR_Y, w: 1.45, h: HDR_H,
      fontSize: 10, bold: true, color: 'BBF7D0',
      align: 'center', valign: 'middle', charSpacing: 1,
    })

    // Factor badge
    sl.addShape('rect' as any, {
      x: 11.83, y: HDR_Y, w: 0.9, h: HDR_H,
      fill: { color: fi.color }, line: { color: fi.color },
    })
    sl.addText(`F${s.factor}`, {
      x: 11.83, y: HDR_Y, w: 0.9, h: HDR_H / 2,
      fontSize: 14, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'bottom',
    })
    sl.addText(fi.label, {
      x: 11.83, y: HDR_Y + HDR_H / 2, w: 0.9, h: HDR_H / 2,
      fontSize: 6.5, color: 'FFFFFF',
      align: 'center', valign: 'top',
    })

    // Status badge
    sl.addShape('rect' as any, {
      x: 12.73, y: HDR_Y, w: 0.6, h: HDR_H,
      fill: { color: resolvedHex }, line: { color: resolvedHex },
    })
    sl.addText(s.isResolved ? '✓' : '!', {
      x: 12.73, y: HDR_Y, w: 0.6, h: HDR_H / 2,
      fontSize: 16, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'bottom',
    })
    sl.addText(s.isResolved ? 'DONE' : 'OPEN', {
      x: 12.73, y: HDR_Y + HDR_H / 2, w: 0.6, h: HDR_H / 2,
      fontSize: 6, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'top',
    })

    // Thin separator under header
    sl.addShape('rect' as any, {
      x: 0, y: HDR_H, w: W, h: 0.02,
      fill: { color: 'CBD5E1' }, line: { color: 'CBD5E1' },
    })

    // ══════════════════ LEFT — FEEDBACK ═════════════════════════════════
    // Section background
    sl.addShape('rect' as any, {
      x: L_X, y: BODY_Y, w: L_W, h: BODY_H,
      fill: { color: 'F0F7FF' }, line: { color: 'DBEAFE' },
    })

    // Section header strip
    sl.addShape('rect' as any, {
      x: L_X, y: BODY_Y, w: L_W, h: 0.3,
      fill: { color: 'DBEAFE' }, line: { color: 'DBEAFE' },
    })
    sl.addText('FEEDBACK  ·  Operator tomonidan kiritilgan maʼlumotlar', {
      x: L_X + L_PAD, y: BODY_Y, w: L_W - L_PAD, h: 0.3,
      fontSize: 8, bold: true, color: '1E40AF', valign: 'middle',
    })

    // Data rows helper
    const LBL_W  = 1.65
    const VAL_X  = L_X + L_PAD + LBL_W
    const VAL_W  = L_W - L_PAD - LBL_W - 0.1
    const ROW_H  = 0.27

    let ry = BODY_Y + 0.32

    const feedRows: Array<{ lbl: string; val: string; bold?: boolean; mono?: boolean; accent?: boolean }> = [
      { lbl: 'Sexi',         val: s.shop },
      { lbl: 'Sektor',       val: s.sector ?? '—' },
      { lbl: 'PONO',         val: s.pono ?? '—', mono: true, accent: !!s.pono },
      { lbl: 'Nuqson kodi',  val: s.defectCode, bold: true },
      { lbl: 'Nuqson nomi',  val: s.defectName },
      { lbl: 'Soni',         val: `${s.count} ta` },
      { lbl: 'Faktor',       val: `${s.factor}  —  ${fi.label}` },
      { lbl: 'Sana',         val: s.date },
      { lbl: 'Manba',        val: s.source },
    ]
    if (s.operatorNotes) feedRows.push({ lbl: 'Izoh', val: s.operatorNotes })

    for (const row of feedRows) {
      // Alternating row stripe
      sl.addShape('rect' as any, {
        x: L_X + 0.05, y: ry, w: L_W - 0.1, h: ROW_H,
        fill: { color: feedRows.indexOf(row) % 2 === 0 ? 'FFFFFF' : 'F0F7FF' },
        line: { color: 'E9F0FB' },
      })
      sl.addText(row.lbl + ':', {
        x: L_X + L_PAD, y: ry, w: LBL_W, h: ROW_H,
        fontSize: 8, color: '475569', valign: 'middle',
      })
      sl.addText(row.val, {
        x: VAL_X, y: ry, w: VAL_W, h: ROW_H,
        fontSize: 8,
        bold: row.bold ?? false,
        color: row.accent ? '1D4ED8' : (row.bold ? '0F172A' : '1E293B'),
        valign: 'middle',
        fontFace: row.mono ? 'Courier New' : 'Calibri',
      })
      ry += ROW_H
    }

    // Photo before
    const photoH = BODY_Y + BODY_H - ry - 0.12
    if (photoH > 0.6) {
      if (s.photoBefore) {
        try {
          sl.addImage({
            data: s.photoBefore,
            x: L_X + L_PAD, y: ry + 0.08,
            w: L_W - L_PAD * 2, h: photoH,
          })
        } catch (_) { /* skip broken image */ }
      } else {
        sl.addShape('rect' as any, {
          x: L_X + L_PAD, y: ry + 0.08,
          w: L_W - L_PAD * 2, h: photoH,
          fill: { color: 'EFF6FF' },
          line: { color: 'BFDBFE', dashType: 'dash', width: 0.5 },
        })
        sl.addText('📷  Nuqson rasmi kiritilmagan', {
          x: L_X + L_PAD, y: ry + 0.08,
          w: L_W - L_PAD * 2, h: photoH,
          fontSize: 8, color: '93C5FD', align: 'center', valign: 'middle',
        })
      }
    }

    // ─── Vertical divider ────────────────────────────────────────────────
    sl.addShape('rect' as any, {
      x: DIV_X, y: BODY_Y, w: DIV_W, h: BODY_H,
      fill: { color: 'CBD5E1' }, line: { color: 'CBD5E1' },
    })

    // ══════════════════ RIGHT — ACTION ═══════════════════════════════════
    // Section background
    sl.addShape('rect' as any, {
      x: R_X, y: BODY_Y, w: R_W, h: BODY_H,
      fill: { color: 'F0FFF6' }, line: { color: 'DCFCE7' },
    })

    // Section header strip
    sl.addShape('rect' as any, {
      x: R_X, y: BODY_Y, w: R_W, h: 0.3,
      fill: { color: 'DCFCE7' }, line: { color: 'DCFCE7' },
    })
    sl.addText('ACTION  ·  Muhandis tomonidan yozilgan chora-tadbirlar', {
      x: R_X + R_PAD, y: BODY_Y, w: R_W - R_PAD, h: 0.3,
      fontSize: 8, bold: true, color: '166534', valign: 'middle',
    })

    // Action data rows
    const A_LBL_W = 2.0
    const A_VAL_X = R_X + R_PAD + A_LBL_W
    const A_VAL_W = R_W - R_PAD - A_LBL_W - 0.15
    const A_ROW_H = 0.32

    let ar = BODY_Y + 0.32

    const actionRows: Array<{ lbl: string; val: string | null }> = [
      { lbl: 'Sababi',          val: s.cause },
      { lbl: 'Chora-tadbir',    val: s.action },
      { lbl: 'Brake Point',     val: s.brakePoint },
      { lbl: 'Muhandis',        val: s.resolvedByName },
      { lbl: 'Bartaraf sanasi', val: s.resolvedAt ? new Date(s.resolvedAt).toLocaleDateString('uz-UZ') : null },
    ]

    for (const row of actionRows) {
      const empty = !row.val
      sl.addShape('rect' as any, {
        x: R_X + 0.05, y: ar, w: R_W - 0.1, h: A_ROW_H,
        fill: { color: actionRows.indexOf(row) % 2 === 0 ? 'FFFFFF' : 'F0FFF6' },
        line: { color: 'D1FAE5' },
      })
      sl.addText(row.lbl + ':', {
        x: R_X + R_PAD, y: ar, w: A_LBL_W, h: A_ROW_H,
        fontSize: 8, color: '475569', valign: 'middle',
      })
      sl.addText(empty ? '— kiritilmagan —' : row.val!, {
        x: A_VAL_X, y: ar, w: A_VAL_W, h: A_ROW_H,
        fontSize: 8,
        color: empty ? 'A3B8CC' : '0F172A',
        italic: empty,
        valign: 'middle',
      })
      ar += A_ROW_H
    }

    // Resolution status banner
    ar += 0.1
    sl.addShape('rect' as any, {
      x: R_X + R_PAD, y: ar, w: R_W - R_PAD * 2, h: 0.34,
      fill: { color: s.isResolved ? '166534' : '92400E' },
      line: { color: s.isResolved ? '166534' : '92400E' },
    })
    sl.addText(
      s.isResolved
        ? `✓  Bartaraf etildi${s.resolvedByName ? '  ·  ' + s.resolvedByName : ''}`
        : '⏳  Hali bartaraf etilmagan — muhandis kutilmoqda',
      {
        x: R_X + R_PAD, y: ar, w: R_W - R_PAD * 2, h: 0.34,
        fontSize: 9, bold: true, color: 'FFFFFF',
        align: 'center', valign: 'middle',
      }
    )
    ar += 0.44

    // Photo after
    const aphH = BODY_Y + BODY_H - ar - 0.12
    if (aphH > 0.6) {
      if (s.photoAfter) {
        try {
          sl.addImage({
            data: s.photoAfter,
            x: R_X + R_PAD, y: ar + 0.08,
            w: R_W - R_PAD * 2, h: aphH,
          })
        } catch (_) { /* skip broken image */ }
      } else {
        sl.addShape('rect' as any, {
          x: R_X + R_PAD, y: ar + 0.08,
          w: R_W - R_PAD * 2, h: aphH,
          fill: { color: 'F0FDF4' },
          line: { color: 'BBF7D0', dashType: 'dash', width: 0.5 },
        })
        sl.addText('📷  Bartaraf etilgan nuqson rasmi kiritilmagan', {
          x: R_X + R_PAD, y: ar + 0.08,
          w: R_W - R_PAD * 2, h: aphH,
          fontSize: 8, color: '86EFAC', align: 'center', valign: 'middle',
        })
      }
    }

    // ══════════════════════ FOOTER ═══════════════════════════════════════
    const FOOT_Y = H - FOOT_H
    sl.addShape('rect' as any, {
      x: 0, y: FOOT_Y, w: W, h: FOOT_H,
      fill: { color: 'F1F5F9' }, line: { color: 'E2E8F0' },
    })
    sl.addText('UzAuto Motors  ·  Quality Control System  ·  Maxfiy', {
      x: 0.2, y: FOOT_Y, w: 6, h: FOOT_H,
      fontSize: 6.5, color: '94A3B8', valign: 'middle',
    })
    sl.addText(new Date().toLocaleDateString('uz-UZ'), {
      x: 6, y: FOOT_Y, w: 4, h: FOOT_H,
      fontSize: 6.5, color: '94A3B8', align: 'center', valign: 'middle',
    })
    sl.addText(`${si + 1}  /  ${slides.length}`, {
      x: W - 1.8, y: FOOT_Y, w: 1.6, h: FOOT_H,
      fontSize: 6.5, color: '94A3B8', align: 'right', valign: 'middle',
    })
  }

  await prs.writeFile({ fileName })
}

// ─── Slide preview card ───────────────────────────────────────────────────────
function SlideCard({ s, idx }: { s: SlideData; idx: number }) {
  const fi  = FACTOR_INFO[s.factor] ?? { badge: 'bg-gray-100 text-gray-600', label: `F${s.factor}` }
  const shopColor = `#${SHOP_COLORS[s.shop] ?? '374151'}`

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden text-sm">
      {/* Card top bar */}
      <div className="flex items-stretch h-10">
        <div className="flex items-center px-3 font-bold text-white text-xs tracking-widest" style={{ background: '#1E3A5F', minWidth: 80 }}>
          QUALITY
        </div>
        <div className="flex items-center px-3 font-bold text-white text-xs tracking-wider" style={{ background: shopColor }}>
          {s.shop}
        </div>
        <div className="flex-1 flex items-center px-3 text-xs text-muted-foreground bg-muted/30">
          {s.defectCode} — {s.defectName}
        </div>
        <div className={`flex items-center px-3 text-xs font-bold rounded-none ${fi.badge}`}>
          F{s.factor}
        </div>
        <div className={`flex items-center px-3 text-xs font-bold text-white ${s.isResolved ? 'bg-green-700' : 'bg-amber-700'}`}>
          {s.isResolved ? '✓ DONE' : 'OPEN'}
        </div>
      </div>

      {/* Two column body */}
      <div className="flex divide-x divide-border">
        {/* FEEDBACK */}
        <div className="w-2/5 bg-blue-50 p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">Feedback — Operator</p>
          {[
            ['Sexi',        s.shop],
            ['Sektor',      s.sector ?? '—'],
            ['PONO',        s.pono ?? '—'],
            ['Kod',         s.defectCode],
            ['Nuqson',      s.defectName],
            ['Soni',        `${s.count} ta`],
            ['Faktor',      `${s.factor}`],
            ['Sana',        s.date],
            ['Manba',       s.source],
          ].map(([l, v]) => (
            <div key={l} className="flex gap-2">
              <span className="text-[10px] text-blue-400 w-14 shrink-0">{l}:</span>
              <span className="text-[10px] text-slate-700 font-medium break-all">{v}</span>
            </div>
          ))}
          {s.photoBefore && (
            <img src={s.photoBefore} alt="before" className="w-full h-20 object-cover rounded mt-2 border border-blue-200" />
          )}
        </div>

        {/* ACTION */}
        <div className="flex-1 bg-green-50 p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2">Action — Muhandis</p>
          {[
            ['Sababi',     s.cause],
            ['Chora',      s.action],
            ['Brake Pt.',  s.brakePoint],
            ['Muhandis',   s.resolvedByName],
          ].map(([l, v]) => (
            <div key={l} className="flex gap-2">
              <span className="text-[10px] text-green-500 w-16 shrink-0">{l}:</span>
              <span className={`text-[10px] ${v ? 'text-slate-700 font-medium' : 'text-slate-400 italic'} break-words`}>
                {v ?? '— kiritilmagan —'}
              </span>
            </div>
          ))}
          <div className={`mt-2 px-3 py-1.5 rounded text-[10px] font-bold text-white text-center ${s.isResolved ? 'bg-green-700' : 'bg-amber-700'}`}>
            {s.isResolved ? `✓ Bartaraf etildi${s.resolvedByName ? ' · ' + s.resolvedByName : ''}` : '⏳ Hali bartaraf etilmagan'}
          </div>
          {s.photoAfter && (
            <img src={s.photoAfter} alt="after" className="w-full h-20 object-cover rounded mt-2 border border-green-200" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function FeedbackReportPage() {
  const { records: gcaR } = useGCA()
  const { records: qR }   = useQRecords()
  const { records: dR }   = useDRecords()

  const [filterShop,     setFilterShop]     = useState('')
  const [filterResolved, setFilterResolved] = useState<'all' | 'resolved' | 'open'>('all')
  const [filterSource,   setFilterSource]   = useState('')
  const [previewId,      setPreviewId]      = useState<string | null>(null)
  const [generating,     setGenerating]     = useState(false)

  // ── Resolutions: muhandislar bartaraf etgan nuqsonlar ────────────────────
  const [gaResolutions,      setGaResolutions]      = useState<Record<string, ResolutionEntry>>({})
  const [weldingResolutions, setWeldingResolutions] = useState<Record<string, ResolutionEntry>>({})

  useEffect(() => {
    // GA engineer resolutions (GCA records uchun)
    fetch('/api/resolutions?type=ga')
      .then(r => r.ok ? r.json() : {})
      .then(data => setGaResolutions(data))
      .catch(() => {})
    // Welding engineer resolutions (D records uchun)
    fetch('/api/resolutions?type=welding')
      .then(r => r.ok ? r.json() : {})
      .then(data => setWeldingResolutions(data))
      .catch(() => {})
  }, [])

  // Build slides from all record sources
  const allSlides: SlideData[] = [
    ...gcaR.map(r => {
      const res = gaResolutions[r.id]
      const isResolved = res?.status === 'yopilgan' || res?.status === 'uzatilgan'
      return {
        id: r.id, shop: r.shop, sector: r.sector ?? null, pono: r.pono ?? null,
        defectCode: r.code, defectName: r.codeName, factor: r.factor,
        count: r.count, date: r.date, operatorNotes: r.notes ?? null,
        photoBefore: r.image_url ?? null,
        cause:          res ? (res.rootCause || res.problemDescription || null) : null,
        action:         res ? ([res.immediateAction, res.mainAction].filter(Boolean).join(' | ') || null) : null,
        brakePoint:     res?.transferTarget || null,
        photoAfter:     null,
        isResolved,
        resolvedByName: res?.createdByName ?? null,
        resolvedAt:     res?.resolvedAt ?? null,
        source: 'GCA',
      }
    }),
    ...qR.map(r => ({
      id: r.id, shop: r.shop, sector: r.sector ?? null, pono: r.pono ?? null,
      defectCode: r.code, defectName: r.codeName, factor: r.factor,
      count: r.count, date: r.date, operatorNotes: r.notes ?? null,
      photoBefore: r.imageUrl ?? null,
      cause: r.cause ?? null, action: r.action ?? null,
      brakePoint: r.brakePoint ?? null, photoAfter: r.photoAfter ?? null,
      isResolved: r.isResolved ?? false,
      resolvedByName: r.resolvedByName ?? null, resolvedAt: r.resolvedAt ?? null,
      source: r.type?.toUpperCase() ?? 'QC',
    })),
    ...dR.map(r => {
      const res = weldingResolutions[r.id]
      const isResolved = res?.status === 'yopilgan' || res?.status === 'uzatilgan'
      return {
        id: r.id, shop: r.shop, sector: r.sector ?? null, pono: r.pono ?? null,
        defectCode: r.code, defectName: r.codeName, factor: r.factor,
        count: r.count, date: r.date, operatorNotes: r.notes ?? null,
        photoBefore: r.image_url ?? null,
        cause:          res ? (res.rootCause || res.problemDescription || null) : null,
        action:         res ? ([res.immediateAction, res.mainAction].filter(Boolean).join(' | ') || null) : null,
        brakePoint:     res?.transferTarget || null,
        photoAfter:     null,
        isResolved,
        resolvedByName: res?.createdByName ?? null,
        resolvedAt:     res?.resolvedAt ?? null,
        source: r.type?.toUpperCase() ?? 'D',
      }
    }),
  ]

  const slides = allSlides
    .filter(s => !filterShop   || s.shop   === filterShop)
    .filter(s => !filterSource || s.source === filterSource)
    .filter(s =>
      filterResolved === 'resolved' ? s.isResolved :
      filterResolved === 'open'     ? !s.isResolved : true
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const handleDownload = async (id?: string) => {
    setGenerating(true)
    try {
      const target = id ? slides.filter(s => s.id === id) : slides
      const date   = new Date().toISOString().split('T')[0]
      const name   = id ? `feedback-${target[0]?.defectCode}-${date}.pptx` : `feedback-report-${date}.pptx`
      await buildPPTX(target, name)
    } catch (e) {
      console.error(e)
      alert('Xatolik yuz berdi!')
    } finally {
      setGenerating(false)
    }
  }

  const SHOPS   = ['PRESS SHOP','WELDING-1','WELDING-2','PAINT SHOP','GA']
  const SOURCES = ['GCA','DRR','DRL','PDI','D10','D20']
  const resolvedN = slides.filter(s => s.isResolved).length
  const openN     = slides.filter(s => !s.isResolved).length

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Feedback Report — PPTX"
        description="Operator va muhandis maʼlumotlari asosida professional PPTX hisobot"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Feedback Report' },
        ]}
      />

      <div className="p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Jami slaydlar',    value: slides.length, cls: 'text-foreground', border: 'border-border' },
            { label: 'Bartaraf etildi',  value: resolvedN,     cls: 'text-green-600',  border: 'border-green-200' },
            { label: 'Ochiq nuqsonlar',  value: openN,         cls: 'text-amber-600',  border: 'border-amber-200' },
            { label: 'Jami yozuvlar',    value: allSlides.length, cls: 'text-blue-600', border: 'border-blue-200' },
          ].map(k => (
            <div key={k.label} className={`bg-card border-2 ${k.border} rounded-xl p-4`}>
              <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters + Download button */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={filterShop} onChange={e => setFilterShop(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground">
            <option value="">Barcha sehlar</option>
            {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground">
            <option value="">Barcha manba</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterResolved} onChange={e => setFilterResolved(e.target.value as any)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground">
            <option value="all">Barchasi</option>
            <option value="resolved">Bartaraf etilganlar</option>
            <option value="open">Ochiq nuqsonlar</option>
          </select>

          {slides.length > 0 && (
            <button
              onClick={() => handleDownload()}
              disabled={generating}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 shadow"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Tayyorlanmoqda...</>
                : <><Presentation className="w-4 h-4" />PPTX yuklab olish ({slides.length} ta)</>}
            </button>
          )}
        </div>

        {/* Info box */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-800">FEEDBACK qismi</p>
              <p className="text-xs text-blue-600">Operator kiritgan maʼlumotlar: sexi, PONO, nuqson kodi, soni, faktor, sana va rasm</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-green-800">ACTION qismi</p>
              <p className="text-xs text-green-600">Muhandis yozgan chora-tadbirlar: sabab, chora, brake point va bartaraf etilgan nuqson rasmi</p>
            </div>
          </div>
        </div>

        {/* Slides */}
        {slides.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <FileText className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold text-foreground mb-1">Maʼlumot topilmadi</p>
            <p className="text-sm text-muted-foreground">Operator nuqson kiritmagan yoki filtr mos kelmaydi</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">{slides.length} ta slayd</h2>
              <p className="text-xs text-muted-foreground">Har birini alohida yoki hammasini PPTX qilib yuklab olish mumkin</p>
            </div>

            {slides.map((s, idx) => (
              <div key={s.id}>
                {/* Row controls */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-t-xl border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-700 text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                    <span className="text-sm font-semibold text-foreground">{s.shop}</span>
                    {s.sector && <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">{s.sector}</span>}
                    {s.pono   && <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{s.pono}</span>}
                    <span className="text-sm text-muted-foreground">— <span className="font-mono font-semibold">{s.defectCode}</span> · {s.defectName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.isResolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.isResolved ? '✓ Bartaraf etildi' : '⏳ Ochiq'}
                    </span>
                    <button
                      onClick={() => handleDownload(s.id)}
                      disabled={generating}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-medium hover:bg-blue-800 transition-colors disabled:opacity-40"
                    >
                      <Download className="w-3 h-3" /> PPTX
                    </button>
                    <button
                      onClick={() => setPreviewId(previewId === s.id ? null : s.id)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-border bg-card text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors"
                    >
                      {previewId === s.id ? <><EyeOff className="w-3 h-3" />Yopish</> : <><Eye className="w-3 h-3" />Ko'rish</>}
                    </button>
                  </div>
                </div>

                {/* Preview */}
                {previewId === s.id && (
                  <div className="border border-border border-t-0 rounded-b-xl overflow-hidden">
                    <SlideCard s={s} idx={idx} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

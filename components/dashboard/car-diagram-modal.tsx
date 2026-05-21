'use client'

import { useState } from 'react'
import { gcaDefectCodes, gcaFactorOptions } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, MapPin, Plus } from 'lucide-react'

export type CarModel = 'DAMAS' | 'LABO'

interface ZoneInfo {
  id: string
  label: string
  nameUz: string
  x: number; y: number; w: number; h: number
  cx: number; cy: number
  fs?: number
}

// ─────────────────────────────────────────────────────────────────────────────
//  DAMAS  —  Top-down PLAN VIEW  (matches the provided blueprint)
//  viewBox = "0 0 900 430"
//  Orientation : REAR = LEFT  |  FRONT = RIGHT
//
//  Layout bands:
//    y=55–190   TOP STRIP   — Left-side body panels (rear→front)
//    y=190–214  SILL TOP    — 974  (chap roker)
//    y=214–238  SILL BOT    — 973  (o'ng roker)
//    y=238–373  BOT STRIP   — Right-side body panels (rear→front)
//    x=830–880  FRONT FACE  — AB front bumper
//    x=0–55     SIDE ELEV   — BE / AE (small left-side elevation)
//
//  Column X boundaries (rear→front):
//    55 | 118 | 213 | 274 | 335 | 396 | 456 | 513 | 572 | 614 | 655 | 737 | 796 | 830 | 880
// ─────────────────────────────────────────────────────────────────────────────
const DAMAS_ZONES: ZoneInfo[] = [
  // ═══ TOP STRIP  (Left side of car)  y=55–190 ════════════════════════════
  { id:'L_CD',  label:'CD',  nameUz:'Orqa-chap qanot',          x:55,  y:55,  w:63,  h:135, cx:87,  cy:122 },
  { id:'965',   label:'965', nameUz:'Chap orqa eshik',           x:118, y:55,  w:95,  h:135, cx:165, cy:122 },
  { id:'L_969', label:'969', nameUz:"Chap orqa panel (o'rta)",  x:213, y:55,  w:61,  h:135, cx:244, cy:122 },
  { id:'L_BD',  label:'BD',  nameUz:"Chap o'rta panel (orqa)",  x:274, y:55,  w:61,  h:135, cx:305, cy:122 },
  { id:'L_967', label:'967', nameUz:"Chap o'rta qanot",         x:335, y:55,  w:61,  h:135, cx:366, cy:122 },
  { id:'L_AD',  label:'AD',  nameUz:"Chap o'rta panel",         x:396, y:55,  w:60,  h:135, cx:426, cy:122 },
  { id:'L_BC',  label:'BC',  nameUz:"Chap old-o'rta qanot",    x:456, y:55,  w:57,  h:135, cx:485, cy:122 },
  { id:'L_AC',  label:'AC',  nameUz:'Chap old panel',           x:513, y:55,  w:59,  h:135, cx:543, cy:122 },
  { id:'L_CE',  label:'CE',  nameUz:'Chap C-ustun atrofi',      x:572, y:55,  w:42,  h:135, cx:593, cy:122 },
  { id:'L_DE',  label:'DE',  nameUz:'Chap D-ustun panel',       x:614, y:55,  w:41,  h:135, cx:635, cy:122 },
  { id:'963',   label:'963', nameUz:'Chap oldingi eshik',        x:655, y:55,  w:82,  h:135, cx:696, cy:122 },
  { id:'L_BB',  label:'BB',  nameUz:'Chap old qanot / B-ustun', x:737, y:55,  w:59,  h:135, cx:767, cy:122 },
  { id:'L_CB',  label:'CB',  nameUz:'Chap old burcha',          x:796, y:55,  w:34,  h:135, cx:813, cy:122 },

  // ═══ SILL PANELS  y=190–238 ══════════════════════════════════════════════
  { id:'974', label:'974', nameUz:'Chap roker (polka)',   x:118, y:190, w:712, h:24, cx:474, cy:202, fs:8 },
  { id:'973', label:'973', nameUz:"O'ng roker (polka)",   x:118, y:214, w:712, h:24, cx:474, cy:226, fs:8 },

  // ═══ BOTTOM STRIP  (Right side of car)  y=238–373 ═══════════════════════
  { id:'R_CD',  label:'CD',  nameUz:"Orqa-o'ng qanot",           x:55,  y:238, w:63,  h:135, cx:87,  cy:305 },
  { id:'966',   label:'966', nameUz:"O'ng orqa eshik",            x:118, y:238, w:95,  h:135, cx:165, cy:305 },
  { id:'R_970', label:'970', nameUz:"O'ng orqa panel (o'rta)",   x:213, y:238, w:61,  h:135, cx:244, cy:305 },
  { id:'R_BD',  label:'BD',  nameUz:"O'ng o'rta panel (orqa)",   x:274, y:238, w:61,  h:135, cx:305, cy:305 },
  { id:'R_968', label:'968', nameUz:"O'ng o'rta qanot",          x:335, y:238, w:61,  h:135, cx:366, cy:305 },
  { id:'R_AD',  label:'AD',  nameUz:"O'ng o'rta panel",          x:396, y:238, w:60,  h:135, cx:426, cy:305 },
  { id:'R_BC',  label:'BC',  nameUz:"O'ng old-o'rta qanot",     x:456, y:238, w:57,  h:135, cx:485, cy:305 },
  { id:'R_AC',  label:'AC',  nameUz:"O'ng old panel",            x:513, y:238, w:59,  h:135, cx:543, cy:305 },
  { id:'R_CE',  label:'CE',  nameUz:"O'ng C-ustun atrofi",       x:572, y:238, w:42,  h:135, cx:593, cy:305 },
  { id:'R_DE',  label:'DE',  nameUz:"O'ng D-ustun panel",        x:614, y:238, w:41,  h:135, cx:635, cy:305 },
  { id:'964',   label:'964', nameUz:"O'ng oldingi eshik",         x:655, y:238, w:82,  h:135, cx:696, cy:305 },
  { id:'R_BB',  label:'BB',  nameUz:"O'ng old qanot / B-ustun",  x:737, y:238, w:59,  h:135, cx:767, cy:305 },
  { id:'R_CB',  label:'CB',  nameUz:"O'ng old burcha",            x:796, y:238, w:34,  h:135, cx:813, cy:305 },

  // ═══ FRONT BUMPER  x=830–880, full height ════════════════════════════════
  { id:'AB', label:'AB', nameUz:'Old bamper', x:830, y:55, w:50, h:318, cx:855, cy:214 },

  // ═══ LEFT SIDE ELEVATION  x=0–55 ═════════════════════════════════════════
  { id:'BE', label:'BE', nameUz:'Chap yon panel (BE)',       x:0, y:75,  w:55, h:110, cx:27, cy:130 },
  { id:'AE', label:'AE', nameUz:'A-ustun / old shisha (AE)', x:0, y:245, w:55, h:110, cx:27, cy:300 },
]

// ─────────────────────────────────────────────────────────────────────────────
//  LABO  —  Top-down PLAN VIEW  (pickup truck)
//  viewBox = "0 0 900 430"
//  Cab section  (front half)  +  Open bed  (rear half)
// ─────────────────────────────────────────────────────────────────────────────
const LABO_ZONES: ZoneInfo[] = [
  // ═══ TOP STRIP (Left side) ═══════════════════════════════════════════════
  // Bed section (rear)
  { id:'L_BD_bed', label:'BD',  nameUz:'Chap yuk kuzovi orqa bort', x:55,  y:55,  w:200, h:135, cx:155, cy:122 },
  { id:'L_AD_bed', label:'AD',  nameUz:'Chap yuk kuzovi old bort',  x:255, y:55,  w:160, h:135, cx:335, cy:122 },
  // Cab door
  { id:'963',      label:'963', nameUz:'Chap kabina eshigi',         x:415, y:55,  w:170, h:135, cx:500, cy:122 },
  // Cab front
  { id:'L_BB',     label:'BB',  nameUz:'Chap old qanot / kapot',    x:585, y:55,  w:120, h:135, cx:645, cy:122 },
  { id:'L_CB',     label:'CB',  nameUz:'Chap old burcha',           x:705, y:55,  w:50,  h:135, cx:730, cy:122 },
  { id:'L_AE',     label:'AE',  nameUz:'Chap old shisha (A-ustun)', x:755, y:55,  w:45,  h:135, cx:778, cy:122 },

  // ═══ SILL PANELS ══════════════════════════════════════════════════════════
  { id:'974', label:'974', nameUz:'Chap roker (polka)',  x:415, y:190, w:390, h:24, cx:610, cy:202, fs:8 },
  { id:'973', label:'973', nameUz:"O'ng roker (polka)", x:415, y:214, w:390, h:24, cx:610, cy:226, fs:8 },

  // ═══ BOTTOM STRIP (Right side) ════════════════════════════════════════════
  { id:'R_BD_bed', label:'BD',  nameUz:"O'ng yuk kuzovi orqa bort", x:55,  y:238, w:200, h:135, cx:155, cy:305 },
  { id:'R_AD_bed', label:'AD',  nameUz:"O'ng yuk kuzovi old bort",  x:255, y:238, w:160, h:135, cx:335, cy:305 },
  { id:'964',      label:'964', nameUz:"O'ng kabina eshigi",         x:415, y:238, w:170, h:135, cx:500, cy:305 },
  { id:'R_BB',     label:'BB',  nameUz:"O'ng old qanot / kapot",    x:585, y:238, w:120, h:135, cx:645, cy:305 },
  { id:'R_CB',     label:'CB',  nameUz:"O'ng old burcha",            x:705, y:238, w:50,  h:135, cx:730, cy:305 },
  { id:'R_AE',     label:'AE',  nameUz:"O'ng old shisha (A-ustun)", x:755, y:238, w:45,  h:135, cx:778, cy:305 },

  // ═══ BED FLOOR (center, visible from above) ══════════════════════════════
  { id:'DE', label:'DE', nameUz:'Yuk kuzovi poli (pol)',  x:55,  y:190, w:360, h:48, cx:235, cy:214 },

  // ═══ FRONT BUMPER ═════════════════════════════════════════════════════════
  { id:'AB', label:'AB', nameUz:'Old bamper', x:800, y:55, w:55, h:318, cx:828, cy:214 },

  // ═══ REAR GATE ════════════════════════════════════════════════════════════
  { id:'CC', label:'CC', nameUz:'Orqa bort / darvoza', x:0, y:55, w:55, h:318, cx:27, cy:214 },
]

// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  model: CarModel
  onClose: () => void
  onAdd: (p: {
    zone: string; zoneNameUz: string
    code: string; codeName: string
    factor: number; count: number
  }) => void
}

export default function CarDiagramModal({ model, onClose, onAdd }: Props) {
  const zones = model === 'DAMAS' ? DAMAS_ZONES : LABO_ZONES

  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null)
  const [hoveredId,    setHoveredId]    = useState<string | null>(null)
  const [code,         setCode]         = useState(gcaDefectCodes[0].code)
  const [factor,       setFactor]       = useState(5)
  const [count,        setCount]        = useState(1)
  const [added,        setAdded]        = useState(0)

  const handleAdd = () => {
    if (!selectedZone) return
    const defect = gcaDefectCodes.find(d => d.code === code) ?? gcaDefectCodes[0]
    onAdd({ zone: selectedZone.id, zoneNameUz: selectedZone.nameUz, code, codeName: defect.name, factor, count })
    setAdded(n => n + 1)
    setCode(gcaDefectCodes[0].code)
    setFactor(5)
    setCount(1)
  }

  // ── render one clickable zone rect ──────────────────────
  const renderZone = (z: ZoneInfo) => {
    const isSel = selectedZone?.id === z.id
    const isHov = hoveredId === z.id && !isSel

    const fill        = isSel ? '#2563eb' : isHov ? '#1d4ed8' : '#0c1f3a'
    const fillOpacity = isSel ? 0.92      : isHov ? 0.72      : 0.55
    const stroke      = isSel ? '#93c5fd' : isHov ? '#3b82f6' : '#1e3a5f'
    const textFill    = isSel ? '#fff'    : isHov ? '#bfdbfe' : '#4a6fa5'

    return (
      <g key={z.id}
        onClick={() => setSelectedZone(z)}
        onMouseEnter={() => setHoveredId(z.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
        className="transition-colors duration-100"
      >
        <rect
          x={z.x} y={z.y} width={z.w} height={z.h}
          rx={2}
          fill={fill} fillOpacity={fillOpacity}
          stroke={stroke} strokeWidth={1.5}
        />
        <text
          x={z.cx} y={z.cy}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={z.fs ?? 10} fontWeight={isSel ? 700 : 500}
          fill={textFill}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {z.label}
        </text>
      </g>
    )
  }

  // ── decorative window rects (non-clickable) ─────────────
  const DamasWindows = () => (
    <g fill="none" stroke="#0e2244" strokeWidth={1} opacity={0.6}>
      {/* Left side windows */}
      <rect x={130} y={70}  width={72}  height={105} rx={3} />  {/* 965 window */}
      <rect x={666} y={70}  width={58}  height={105} rx={3} />  {/* 963 window */}
      {/* Right side windows */}
      <rect x={130} y={253} width={72}  height={105} rx={3} />  {/* 966 window */}
      <rect x={666} y={253} width={58}  height={105} rx={3} />  {/* 964 window */}
      {/* Interior visible through roof */}
      <rect x={280} y={78}  width={46}  height={88}  rx={2} />  {/* BD interior */}
      <rect x={399} y={78}  width={46}  height={88}  rx={2} />  {/* AD interior */}
      <rect x={280} y={263} width={46}  height={88}  rx={2} />
      <rect x={399} y={263} width={46}  height={88}  rx={2} />
    </g>
  )

  const LaboWindows = () => (
    <g fill="none" stroke="#0e2244" strokeWidth={1} opacity={0.6}>
      <rect x={426} y={70}  width={148} height={105} rx={3} />  {/* 963 window */}
      <rect x={426} y={253} width={148} height={105} rx={3} />  {/* 964 window */}
    </g>
  )

  // ── background car outline ───────────────────────────────
  const DamasBg = () => (
    <>
      {/* Outer car body */}
      <rect x={55} y={55} width={825} height={318} rx={4}
        fill="#070d1a" stroke="#1e3a5f" strokeWidth={1.5} />
      {/* Center separator (between left/right strips) */}
      <line x1={55} y1={190} x2={880} y2={190} stroke="#1e3a5f" strokeWidth={1} />
      <line x1={55} y1={238} x2={880} y2={238} stroke="#1e3a5f" strokeWidth={1} />
      {/* Left side elevation box */}
      <rect x={0} y={55} width={55} height={318} rx={3}
        fill="#050b18" stroke="#1e3a5f" strokeWidth={1} strokeDasharray="4 2" />
      {/* direction labels */}
      <text x={55}  y={390} fontSize={8} fill="#1e3a5f" textAnchor="start">◀ ORQA</text>
      <text x={880} y={390} fontSize={8} fill="#1e3a5f" textAnchor="end">OLD ▶</text>
      {/* side labels */}
      <text x={47} y={47} fontSize={7} fill="#1e4a8a" textAnchor="end">CHAP</text>
      <text x={47} y={385} fontSize={7} fill="#1e4a8a" textAnchor="end">O'NG</text>
    </>
  )

  const LaboBg = () => (
    <>
      {/* Outer body */}
      <rect x={0} y={55} width={855} height={318} rx={4}
        fill="#070d1a" stroke="#1e3a5f" strokeWidth={1.5} />
      {/* Bed separator from cab */}
      <line x1={415} y1={55} x2={415} y2={373} stroke="#1e3a5f" strokeWidth={1.5} strokeDasharray="5 3" />
      {/* Center sill lines */}
      <line x1={0}   y1={190} x2={855} y2={190} stroke="#1e3a5f" strokeWidth={1} />
      <line x1={0}   y1={238} x2={855} y2={238} stroke="#1e3a5f" strokeWidth={1} />
      {/* labels */}
      <text x={230}  y={46} fontSize={8} fill="#1e4a8a" textAnchor="middle">YUK KUZOVI</text>
      <text x={620}  y={46} fontSize={8} fill="#1e4a8a" textAnchor="middle">KABINA</text>
      <text x={10}   y={390} fontSize={8} fill="#1e3a5f">◀ ORQA</text>
      <text x={845}  y={390} fontSize={8} fill="#1e3a5f" textAnchor="end">OLD ▶</text>
      <text x={855}  y={47} fontSize={7} fill="#1e4a8a" textAnchor="end">CHAP</text>
      <text x={855}  y={385} fontSize={7} fill="#1e4a8a" textAnchor="end">O'NG</text>
    </>
  )

  const viewBox = model === 'DAMAS' ? '0 0 900 410' : '0 0 870 410'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl
                      max-h-[93vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {model} — Nuqson zonasini belgilang
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chizma ustiga bosib nuqson joyini tanlang, so&apos;ng kod va faktorni kiriting
            </p>
          </div>
          <div className="flex items-center gap-3">
            {added > 0 && (
              <span className="text-xs text-success font-medium bg-success/10 px-2.5 py-1 rounded-full">
                ✓ {added} ta qo&apos;shildi
              </span>
            )}
            <button onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left panel — SVG diagram */}
          <div className="flex-1 bg-[#030810] flex flex-col items-center justify-center
                          p-3 min-w-0 gap-2 overflow-auto">
            <svg
              viewBox={viewBox}
              className="w-full"
              style={{ maxHeight: '58vh', minWidth: 0 }}
            >
              {model === 'DAMAS' ? <DamasBg /> : <LaboBg />}
              {model === 'DAMAS' ? <DamasWindows /> : <LaboWindows />}
              {zones.map(renderZone)}
            </svg>

            {selectedZone ? (
              <p className="text-xs text-blue-400 font-medium flex items-center gap-1.5 shrink-0">
                <MapPin className="w-3 h-3" />
                <span className="font-bold">{selectedZone.label}</span>
                <span className="opacity-60">—</span>
                <span className="opacity-80">{selectedZone.nameUz}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-700 shrink-0">
                Zonani bosish uchun chizmaga tegining
              </p>
            )}
          </div>

          {/* Right panel — defect selection */}
          <div className="w-68 shrink-0 border-l border-border flex flex-col overflow-hidden"
               style={{ width: '270px' }}>

            {/* Selected zone info */}
            <div className="px-4 pt-4 pb-3 shrink-0">
              {selectedZone ? (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-blue-400/80 mb-0.5">Tanlangan zona</p>
                  <p className="text-sm font-bold text-foreground">{selectedZone.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {selectedZone.nameUz}
                  </p>
                </div>
              ) : (
                <div className="bg-muted/20 border border-border rounded-xl p-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Chizmadan nuqson joyini tanlang
                  </p>
                </div>
              )}
            </div>

            {/* Defect code list */}
            <div className="flex-1 overflow-y-auto px-4 min-h-0">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 sticky top-0
                            bg-card py-1">
                Nuqson kodlari:
              </p>
              <div className="space-y-0.5 pb-2">
                {gcaDefectCodes.map(d => (
                  <button
                    key={d.code}
                    onClick={() => setCode(d.code)}
                    className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left
                      transition-colors text-xs
                      ${code === d.code
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      }`}
                  >
                    <span className="font-mono font-bold w-6 shrink-0 mt-px">{d.code}</span>
                    <span className="leading-snug">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Factor + count + submit */}
            <div className="px-4 py-4 border-t border-border shrink-0 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-foreground">Faktor</label>
                  <select
                    value={factor}
                    onChange={e => setFactor(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded-lg
                               text-foreground text-xs"
                  >
                    {gcaFactorOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.value}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-foreground">Soni</label>
                  <Input
                    type="number" min={1} value={count}
                    onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-background border-border text-xs h-7 px-2"
                  />
                </div>
              </div>
              <Button
                onClick={handleAdd}
                disabled={!selectedZone}
                className="w-full gap-1.5 h-9 text-sm"
              >
                <Plus className="w-4 h-4" />
                Qo&apos;shish
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

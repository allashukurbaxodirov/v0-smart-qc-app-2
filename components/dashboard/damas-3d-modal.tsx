'use client'

import { useRef, useState } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { gcaDefectCodes, gcaFactorOptions } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, MapPin, Plus, RotateCcw } from 'lucide-react'

// ─── Zone definitions ────────────────────────────────────────────────────────
interface ZoneDef {
  id: string
  label: string
  nameUz: string
  pos: [number, number, number]
  size: [number, number, number]
  rot?: [number, number, number]
}

const DAMAS_ZONES: ZoneDef[] = [
  // ── Front ────────────────────────────────────────────────────────────────
  { id: 'AB',  label: 'AB',  nameUz: 'Old bamper',
    pos: [0, 0.22, 1.73],   size: [1.55, 0.40, 0.10] },

  { id: 'AC',  label: 'AC',  nameUz: 'Kapot',
    pos: [0, 1.43, 1.28],   size: [1.45, 0.07, 0.74] },

  { id: 'AE',  label: 'AE',  nameUz: 'Old shisha / A-ustun',
    pos: [0, 1.22, 0.93],   size: [1.38, 0.70, 0.07],
    rot: [0.32, 0, 0] },

  // ── Left side (−X) ───────────────────────────────────────────────────────
  { id: '963', label: '963', nameUz: 'Chap oldingi eshik',
    pos: [-0.73, 0.78, 0.28],  size: [0.08, 1.10, 1.02] },

  { id: '965', label: '965', nameUz: 'Chap orqa eshik',
    pos: [-0.73, 0.78, -0.64], size: [0.08, 1.10, 0.90] },

  { id: '968', label: '968', nameUz: 'Chap old qanot (krilo)',
    pos: [-0.73, 0.50, 1.10],  size: [0.08, 0.62, 0.70] },

  { id: 'L_CC', label: 'CC', nameUz: 'Chap orqa qanot',
    pos: [-0.73, 0.78, -1.22], size: [0.08, 0.92, 0.74] },

  { id: '974', label: '974', nameUz: 'Chap roker / polka',
    pos: [-0.73, 0.11, 0.10],  size: [0.08, 0.22, 2.42] },

  // ── Right side (+X) ──────────────────────────────────────────────────────
  { id: '964', label: '964', nameUz: "O'ng oldingi eshik",
    pos: [0.73, 0.78, 0.28],   size: [0.08, 1.10, 1.02] },

  { id: '966', label: '966', nameUz: "O'ng orqa eshik",
    pos: [0.73, 0.78, -0.64],  size: [0.08, 1.10, 0.90] },

  { id: '970', label: '970', nameUz: "O'ng old qanot (krilo)",
    pos: [0.73, 0.50, 1.10],   size: [0.08, 0.62, 0.70] },

  { id: 'R_CC', label: 'CC', nameUz: "O'ng orqa qanot",
    pos: [0.73, 0.78, -1.22],  size: [0.08, 0.92, 0.74] },

  { id: '973', label: '973', nameUz: "O'ng roker / polka",
    pos: [0.73, 0.11, 0.10],   size: [0.08, 0.22, 2.42] },

  // ── Roof ─────────────────────────────────────────────────────────────────
  { id: 'BB',  label: 'BB/BD', nameUz: 'Tom (chap qism)',
    pos: [-0.37, 1.68, 0.08],  size: [0.70, 0.07, 2.82] },

  { id: 'BC',  label: 'BC/BE', nameUz: "Tom (o'ng qism)",
    pos: [0.37, 1.68, 0.08],   size: [0.70, 0.07, 2.82] },

  // ── Rear ─────────────────────────────────────────────────────────────────
  { id: 'CB',  label: 'CB',  nameUz: 'Orqa eshik / bagaj',
    pos: [0, 0.90, -1.70],    size: [1.50, 1.32, 0.08] },

  { id: 'CE',  label: 'CE',  nameUz: 'Orqa bamper',
    pos: [0, 0.22, -1.74],    size: [1.55, 0.40, 0.10] },
]

// ─── Colours ─────────────────────────────────────────────────────────────────
const COL_DEFAULT  = '#0d2040'
const COL_HOVER    = '#163980'
const COL_SELECTED = '#1d4ed8'
const COL_EMISSIVE_SEL = '#0c2a8a'
const COL_EMISSIVE_HOV = '#061530'

// ─── Single panel mesh ───────────────────────────────────────────────────────
function Panel({
  zone, selected, hovered,
  onSelect, onEnter, onLeave,
}: {
  zone: ZoneDef
  selected: boolean
  hovered: boolean
  onSelect: (z: ZoneDef) => void
  onEnter: (id: string) => void
  onLeave: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  const color    = selected ? COL_SELECTED : hovered ? COL_HOVER : COL_DEFAULT
  const emissive = selected ? COL_EMISSIVE_SEL : hovered ? COL_EMISSIVE_HOV : '#000000'
  const emissiveIntensity = selected ? 0.6 : hovered ? 0.3 : 0

  return (
    <mesh
      ref={meshRef}
      position={zone.pos}
      rotation={zone.rot ? zone.rot as unknown as THREE.Euler : [0, 0, 0]}
      userData={{ zoneId: zone.id }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onSelect(zone)
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onEnter(zone.id)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        onLeave()
        document.body.style.cursor = 'default'
      }}
    >
      <boxGeometry args={zone.size} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.30}
        metalness={0.70}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Wheel ────────────────────────────────────────────────────────────────────
function Wheel({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos} rotation={[0, 0, Math.PI / 2]}>
      {/* tyre */}
      <mesh>
        <cylinderGeometry args={[0.29, 0.29, 0.20, 24]} />
        <meshStandardMaterial color="#111" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* rim */}
      <mesh>
        <cylinderGeometry args={[0.18, 0.18, 0.22, 16]} />
        <meshStandardMaterial color="#444" roughness={0.4} metalness={0.8} />
      </mesh>
    </group>
  )
}

// ─── Floor grid ──────────────────────────────────────────────────────────────
function FloorGrid() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]}>
      <planeGeometry args={[8, 8]} />
      <meshStandardMaterial
        color="#050e1f"
        roughness={1}
        metalness={0}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

// ─── Car chassis (body box, non-clickable) ───────────────────────────────────
function Chassis() {
  return (
    <>
      {/* Main body box */}
      <mesh position={[0, 0.82, 0.10]}>
        <boxGeometry args={[1.42, 1.55, 3.40]} />
        <meshStandardMaterial
          color="#0a1828"
          roughness={0.5}
          metalness={0.5}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* Underbody */}
      <mesh position={[0, -0.02, 0.10]}>
        <boxGeometry args={[1.30, 0.26, 3.00]} />
        <meshStandardMaterial color="#070f1e" roughness={0.8} metalness={0.3} />
      </mesh>
    </>
  )
}

// ─── Label tag floating above selected panel ─────────────────────────────────
function FloatingLabel({ zone }: { zone: ZoneDef }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    if (ref.current) ref.current.quaternion.copy(camera.quaternion)
  })
  const [px, py, pz] = zone.pos
  return (
    <mesh ref={ref} position={[px, py + 0.55 + zone.size[1] / 2, pz]}>
      <planeGeometry args={[0.55, 0.18]} />
      <meshBasicMaterial color="#2563eb" transparent opacity={0.92} depthTest={false} />
    </mesh>
  )
}

// ─── Main 3D scene ────────────────────────────────────────────────────────────
function DamasScene({
  selectedId, hoveredId,
  onSelect, onEnter, onLeave,
}: {
  selectedId: string | null
  hoveredId: string | null
  onSelect: (z: ZoneDef) => void
  onEnter: (id: string) => void
  onLeave: () => void
}) {
  const selectedZone = DAMAS_ZONES.find(z => z.id === selectedId) ?? null

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 10, 6]}  intensity={1.1} castShadow />
      <directionalLight position={[-5, 6, -4]} intensity={0.50} />
      <directionalLight position={[0, -3, 0]}  intensity={0.15} />

      {/* Floor */}
      <FloorGrid />

      {/* Chassis (background body) */}
      <Chassis />

      {/* Clickable panels */}
      {DAMAS_ZONES.map(z => (
        <Panel
          key={z.id}
          zone={z}
          selected={selectedId === z.id}
          hovered={hoveredId === z.id && selectedId !== z.id}
          onSelect={onSelect}
          onEnter={onEnter}
          onLeave={onLeave}
        />
      ))}

      {/* Floating label above selected panel */}
      {selectedZone && <FloatingLabel zone={selectedZone} />}

      {/* Wheels */}
      <Wheel pos={[-0.73, -0.01, 1.02]} />
      <Wheel pos={[ 0.73, -0.01, 1.02]} />
      <Wheel pos={[-0.73, -0.01, -0.80]} />
      <Wheel pos={[ 0.73, -0.01, -0.80]} />
    </>
  )
}

// ─── Camera controller ────────────────────────────────────────────────────────
const DEFAULT_CAM: [number, number, number] = [3.2, 2.2, 3.8]

// ─── Modal ────────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void
  onAdd: (p: {
    zone: string; zoneNameUz: string
    code: string; codeName: string
    factor: number; count: number
  }) => void
}

export default function Damas3DModal({ onClose, onAdd }: Props) {
  const [selectedZone, setSelectedZone] = useState<ZoneDef | null>(null)
  const [hoveredId,    setHoveredId]    = useState<string | null>(null)
  const [code,         setCode]         = useState(gcaDefectCodes[0].code)
  const [factor,       setFactor]       = useState(5)
  const [count,        setCount]        = useState(1)
  const [added,        setAdded]        = useState(0)
  const controlsRef = useRef<any>(null)

  const handleAdd = () => {
    if (!selectedZone) return
    const defect = gcaDefectCodes.find(d => d.code === code) ?? gcaDefectCodes[0]
    onAdd({
      zone: selectedZone.id,
      zoneNameUz: selectedZone.nameUz,
      code,
      codeName: defect.name,
      factor,
      count,
    })
    setAdded(n => n + 1)
    setCode(gcaDefectCodes[0].code)
    setFactor(5)
    setCount(1)
  }

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl
                      w-full max-w-6xl max-h-[93vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              DAMAS 3D — Nuqson panelini tanlang
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sichqoncha: <b>aylantirish</b> (drag) · <b>zoom</b> (scroll) · <b>bosish</b> (panel tanlash)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {added > 0 && (
              <span className="text-xs text-success font-medium bg-success/10 px-2.5 py-1 rounded-full">
                ✓ {added} ta qo&apos;shildi
              </span>
            )}
            <button
              onClick={resetCamera}
              title="Kamerani tiklash"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* 3-D Canvas */}
          <div className="flex-1 min-w-0 relative bg-[#020810]">
            <Canvas
              shadows
              gl={{ antialias: true, alpha: false }}
              style={{ width: '100%', height: '100%', minHeight: '400px' }}
              onPointerMissed={() => setSelectedZone(null)}
            >
              <PerspectiveCamera makeDefault position={DEFAULT_CAM} fov={42} />
              <DamasScene
                selectedId={selectedZone?.id ?? null}
                hoveredId={hoveredId}
                onSelect={z => {
                  setSelectedZone(z)
                  setHoveredId(null)
                }}
                onEnter={setHoveredId}
                onLeave={() => setHoveredId(null)}
              />
              <OrbitControls
                ref={controlsRef}
                target={[0, 0.8, 0]}
                minDistance={2.0}
                maxDistance={9.0}
                enablePan={false}
                dampingFactor={0.08}
                enableDamping
              />
            </Canvas>

            {/* Hover tooltip */}
            {hoveredId && !selectedZone && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2
                              bg-black/70 text-white text-xs px-3 py-1.5 rounded-full
                              border border-white/10 pointer-events-none">
                {DAMAS_ZONES.find(z => z.id === hoveredId)?.label} —{' '}
                {DAMAS_ZONES.find(z => z.id === hoveredId)?.nameUz}
              </div>
            )}

            {/* Selected zone badge */}
            {selectedZone && (
              <div className="absolute top-3 left-3
                              bg-blue-600/90 text-white text-xs px-3 py-1.5 rounded-full
                              border border-blue-400/40 flex items-center gap-1.5 pointer-events-none">
                <MapPin className="w-3 h-3" />
                <span className="font-bold">{selectedZone.label}</span>
                <span className="opacity-80">— {selectedZone.nameUz}</span>
              </div>
            )}

            {/* Zone legend */}
            <div className="absolute bottom-3 right-3 text-[9px] text-slate-600 space-y-0.5 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COL_DEFAULT, border: '1px solid #1e3a5f' }} />
                Panel
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COL_HOVER }} />
                Hover
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COL_SELECTED }} />
                Tanlangan
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-[270px] shrink-0 border-l border-border flex flex-col overflow-hidden">

            {/* Zone info */}
            <div className="px-4 pt-4 pb-3 shrink-0">
              {selectedZone ? (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-blue-400/80 mb-0.5">Tanlangan panel</p>
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {selectedZone.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {selectedZone.nameUz}
                  </p>
                </div>
              ) : (
                <div className="bg-muted/20 border border-border rounded-xl p-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground leading-snug">
                    3D modeldagi panelga bosing
                  </p>
                </div>
              )}
            </div>

            {/* Defect code list */}
            <div className="flex-1 overflow-y-auto px-4 min-h-0">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 sticky top-0 bg-card py-1">
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
                    className="bg-background border-border text-xs h-[30px] px-2"
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

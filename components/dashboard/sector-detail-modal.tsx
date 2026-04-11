'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SectorDetailModalProps {
  sector: string | null
  shift: string
  onClose: () => void
  sectorData: any
}

export function SectorDetailModal({ sector, shift, onClose, sectorData }: SectorDetailModalProps) {
  if (!sector || !sectorData || !sectorData[shift]) {
    return null
  }

  const data = sectorData[shift]
  const getRatingColor = (rating: string) => {
    if (rating === 'A+') return 'text-success'
    if (rating === 'A') return 'text-success'
    return 'text-warning'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{sector}</h2>
            <p className="text-sm text-muted-foreground mt-1">{shift} smena</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Jami nuqsonlar</p>
              <p className="text-3xl font-bold text-foreground">{data.defects}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Reyting</p>
              <Badge variant={data.rating === 'A+' || data.rating === 'A' ? 'secondary' : 'default'}>
                <span className={getRatingColor(data.rating)}>{data.rating}</span>
              </Badge>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Holat</p>
              <Badge variant={data.rating === 'A+' ? 'secondary' : 'default'}>
                {data.rating === 'A+' ? '✓ Ajoyib' : data.rating === 'A' ? '✓ Yaxshi' : '⚠ Diqqat'}
              </Badge>
            </div>
          </div>

          {/* Root Cause Analysis */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Muammoning kelib chiqishi</h3>
            <div className="bg-muted/20 border border-border rounded-lg p-4">
              <p className="text-foreground leading-relaxed">{data.rootCause}</p>
            </div>
          </div>

          {/* Mitigation Measures */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Chora-tadbirlar</h3>
            <div className="space-y-2">
              {data.measures.map((measure: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-foreground">{measure}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Keyingi qilinishi kerak bo&apos;lgan ishlar</h3>
            <div className="space-y-2">
              {data.nextSteps.map((step: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success text-success-foreground text-xs font-bold flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <p className="text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Yopish
            </Button>
            <Button className="flex-1">
              Tahlilni saqlash
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

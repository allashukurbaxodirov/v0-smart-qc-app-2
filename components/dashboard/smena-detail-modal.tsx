'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, AlertCircle, CheckCircle, Lightbulb, Settings, ArrowRight } from 'lucide-react'

interface SmenaDetailModalProps {
  smena: string
  data: {
    totalDefects: number
    status: string
    defects: Array<{
      code: string
      name: string
      workshop: string
      count: number
      status: string
    }>
    recommendations: string[]
    rootCauses: string[]
    nextSteps: string[]
  }
  onClose: () => void
}

export function SmenaDetailModal({ smena, data, onClose }: SmenaDetailModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-success text-white'
      case 'warning':
        return 'bg-warning text-white'
      case 'critical':
        return 'bg-critical text-white'
      default:
        return 'bg-muted text-foreground'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{smena}</h2>
            <p className="text-sm text-muted-foreground">Smena tafsiloti va tahlil</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Jami nuqsonlar</p>
              <p className="text-3xl font-bold text-foreground">{data.totalDefects}</p>
            </div>
            <div className={`rounded-lg p-4 ${data.status === 'good' ? 'bg-success/10 border border-success/30' : 'bg-critical/10 border border-critical/30'}`}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Holat</p>
              <Badge className={getStatusColor(data.status)}>
                {data.status === 'good' ? '✓ Yaxshi' : data.status === 'warning' ? '⚠ Diqqat' : '✕ Muammo'}
              </Badge>
            </div>
          </div>

          {/* Defects List */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-critical" />
              Nuqsonlar ro'yxati
            </h3>
            <div className="space-y-3">
              {data.defects.map((defect) => (
                <div
                  key={defect.code}
                  className={`p-4 rounded-lg border ${
                    defect.status === 'critical'
                      ? 'bg-critical/5 border-critical/30'
                      : 'bg-warning/5 border-warning/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-foreground">
                        {defect.code} - {defect.name}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="bg-muted/50 px-2 py-1 rounded">{defect.workshop}</span>
                        <span>Jami: {defect.count} ta</span>
                      </div>
                    </div>
                    <Badge
                      variant={defect.status === 'critical' ? 'destructive' : 'default'}
                      className="whitespace-nowrap ml-2"
                    >
                      {defect.status === 'critical' ? 'Yomon' : 'Diqqat'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning" />
              Tavsiyalar
            </h3>
            <div className="space-y-2">
              {data.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
                  <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-warning">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-foreground">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Root Causes */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-muted-foreground" />
              Muammo sabablari
            </h3>
            <div className="space-y-2">
              {data.rootCauses.map((cause, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <p className="text-sm text-foreground">{cause}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Keyingi ishlar
            </h3>
            <div className="space-y-2">
              {data.nextSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-success/5 rounded-lg border border-success/20">
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-success">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border p-6 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
          <Button className="gap-2">
            <ArrowRight className="w-4 h-4" />
            Batafsil ko'rish
          </Button>
        </div>
      </div>
    </div>
  )
}

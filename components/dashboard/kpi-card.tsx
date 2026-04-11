'use client'

import { ArrowDown, ArrowUp, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  change?: number
  status?: 'good' | 'warning' | 'critical'
  trend?: 'up' | 'down'
  href?: string
  format?: 'percent' | 'number' | 'decimal'
}

export default function KPICard({
  title,
  value,
  unit = '%',
  change,
  status = 'good',
  trend,
  href,
  format = 'percent',
}: KPICardProps) {
  const statusColors = {
    good: 'bg-success/10 border-success/30 text-success',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    critical: 'bg-critical/10 border-critical/30 text-critical',
  }

  const trendIcon = trend === 'up' ? (
    <ArrowUp className="w-4 h-4" />
  ) : (
    <ArrowDown className="w-4 h-4" />
  )

  const content = (
    <div className={`rounded-xl border p-6 transition-all ${
      href ? 'cursor-pointer hover:border-primary/50 hover:shadow-lg' : ''
    } ${
      status === 'good'
        ? 'bg-success/5 border-success/20'
        : status === 'warning'
          ? 'bg-warning/5 border-warning/20'
          : 'bg-critical/5 border-critical/20'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {status !== 'good' && (
          <div className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[status]}`}>
            {status === 'warning' ? 'Diqqat' : 'Muammo'}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            {format === 'percent' ? value : format === 'decimal' ? Number(value).toFixed(2) : value}
          </span>
          {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
        </div>

        {/* Change Indicator */}
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            trend === 'up' ? 'text-success' : 'text-critical'
          }`}>
            {trendIcon}
            <span>{Math.abs(change)}% {trend === 'up' ? 'oshdi' : 'kamaydi'}</span>
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

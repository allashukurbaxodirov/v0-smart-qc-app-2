'use client'

import PageHeader from '@/components/dashboard/page-header'
import { irasData } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'

export default function IRASPage() {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-critical'
      case 'high':
        return 'text-warning'
      default:
        return 'text-muted-foreground'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">{priority.toUpperCase()}</Badge>
      case 'high':
        return <Badge variant="secondary">{priority.toUpperCase()}</Badge>
      default:
        return <Badge variant="outline">{priority.toUpperCase()}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return '🔴'
      case 'in-progress':
        return '🟡'
      case 'resolved':
        return '🟢'
      default:
        return '⚪'
    }
  }

  const openCount = irasData.filter(i => i.status === 'open').length
  const inProgressCount = irasData.filter(i => i.status === 'in-progress').length
  const resolvedCount = irasData.filter(i => i.status === 'resolved').length

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader
        title="IRAS - Muammolarni Hal Qilish Tizimi"
        description="Ishlab chiqarish muammolarini kuzatish va hal qilish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ishlab chiqarish', href: '/dashboard/workshops' },
          { label: 'IRAS' },
        ]}
      />

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-critical/10 border border-critical/30 rounded-lg p-4">
            <p className="text-sm text-critical font-semibold mb-2">🔴 Ochiq muammolar</p>
            <p className="text-3xl font-bold text-critical">{openCount}</p>
            <p className="text-xs text-muted-foreground mt-2">Hal qilishni kutmoqda</p>
          </div>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
            <p className="text-sm text-warning font-semibold mb-2">🟡 Jarayonda</p>
            <p className="text-3xl font-bold text-warning">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground mt-2">Hal qilinmoqda</p>
          </div>
          <div className="bg-success/10 border border-success/30 rounded-lg p-4">
            <p className="text-sm text-success font-semibold mb-2">🟢 Hal qilingan</p>
            <p className="text-3xl font-bold text-success">{resolvedCount}</p>
            <p className="text-xs text-muted-foreground mt-2">Muammo bartaraf etildi</p>
          </div>
        </div>

        {/* IRAS List */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Muammolar ro'yxati</h2>
          <div className="space-y-3">
            {irasData.map((issue) => (
              <div key={issue.id} className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{getStatusIcon(issue.status)}</span>
                      <h3 className="font-semibold text-foreground">{issue.id}</h3>
                      {getPriorityBadge(issue.priority)}
                    </div>
                    <p className="text-sm text-foreground mb-2">{issue.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Ochilgan: {issue.daysOpen} kun oldin
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold inline-block px-2 py-1 rounded ${
                      issue.status === 'open' ? 'bg-critical/10 text-critical' :
                      issue.status === 'in-progress' ? 'bg-warning/10 text-warning' :
                      'bg-success/10 text-success'
                    }`}>
                      {issue.status === 'open' ? 'Ochiq' : issue.status === 'in-progress' ? "Jarayonda" : 'Hal qilingan'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Tahlil</h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Hozirda {openCount} ta muammo hal qilishni kutmoqda. Ularning {irasData.filter(i => i.status === 'open' && i.priority === 'critical').length} tasi juda muhim (critical priority).
            </p>
            <p>
              {inProgressCount} ta muammo hozir hal qilinmoqda. Agar joriy tezlik saqlansa, 2-3 kundan ichida ko'pgina muammolar hal qilinadi.
            </p>
            <p className="font-semibold text-foreground">Tavsiyalar:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>IRAS-001 muammosiga (Door Assembly) e'tibor berish zarur</li>
              <li>Paint Quality muammasiga qo'shimcha resurslar ajratish</li>
              <li>Critical muammolarni kun ichida hal qilish</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

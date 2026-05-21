'use client'
import { QcEntryPage } from '../../_components/qc-entry-page'

export default function DRREntryPage() {
  return (
    <QcEntryPage cfg={{
      type:        'drr',
      title:       'DRR — Nuqson Kiritish',
      description: "Daily Rejection Rate — rad etilgan detallarni qayd etish",
      dashHref:    '/dashboard/drr-admin',
      dashLabel:   'DRR Dashboard',
      breadParent: 'DRR Dashboard',
    }} />
  )
}

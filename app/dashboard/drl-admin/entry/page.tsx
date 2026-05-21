'use client'
import { QcEntryPage } from '../../_components/qc-entry-page'

export default function DRLEntryPage() {
  return (
    <QcEntryPage cfg={{
      type:        'drl',
      title:       'DRL — Nuqson Kiritish',
      description: "Daily Rework Level — qayta ishlangan detallarni qayd etish",
      dashHref:    '/dashboard/drl-admin',
      dashLabel:   'DRL Dashboard',
      breadParent: 'DRL Dashboard',
    }} />
  )
}

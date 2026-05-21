'use client'
import { QcEntryPage } from '../../_components/qc-entry-page'

export default function PDIEntryPage() {
  return (
    <QcEntryPage cfg={{
      type:        'pdi',
      title:       'PDI — Nuqson Kiritish',
      description: "Pre-Delivery Inspection — yakkuniy tekshiruvda topilgan nuqsonlarni qayd etish",
      dashHref:    '/dashboard/pdi-admin',
      dashLabel:   'PDI Dashboard',
      breadParent: 'PDI Dashboard',
    }} />
  )
}

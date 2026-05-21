'use client'
import { QcDashboardPage } from '../_components/qc-dashboard-page'

export default function PDIDashboardPage() {
  return (
    <QcDashboardPage cfg={{
      type:        'pdi',
      title:       'PDI — Yetkazish Tekshiruvi Dashboard',
      description: "Pre-Delivery Inspection — yakkuniy sifat tekshiruvi natijalari tahlili",
      entryHref:   '/dashboard/pdi-admin/entry',
      entryLabel:  'Nuqson kiritish',
      breadParent: 'PDI Dashboard',
    }} />
  )
}

'use client'
import EngineerEscalationPage from '@/components/dashboard/engineer-escalation-page'

export default function GAEngineerPage() {
  return (
    <EngineerEscalationPage
      role="ga_engineer"
      roleLabel="GA Muhandis"
      shopFilter={['GA']}
      description="GA sehidan GCA Auditor aniqlagan va DRR da chiqqan nuqsonlar"
    />
  )
}

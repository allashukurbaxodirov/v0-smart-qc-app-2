'use client'
import EngineerEscalationPage from '@/components/dashboard/engineer-escalation-page'

export default function PEEngineerPage() {
  return (
    <EngineerEscalationPage
      role="pe_engineer"
      roleLabel="PE Muhandis"
      shopFilter={['PE']}
      description="Process Engineer — jarayon muhandisi nuqsonlarni kuzatish"
    />
  )
}

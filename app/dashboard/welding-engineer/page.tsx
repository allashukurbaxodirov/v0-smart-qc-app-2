'use client'
import EngineerEscalationPage from '@/components/dashboard/engineer-escalation-page'

export default function WeldingEngineerPage() {
  return (
    <EngineerEscalationPage
      role="welding_engineer"
      roleLabel="Welding Muhandis"
      shopFilter={['WELDING', 'WELDING-1', 'WELDING-2']}
      description="Welding sehidan DRR va GCA da chiqqan nuqsonlar"
    />
  )
}

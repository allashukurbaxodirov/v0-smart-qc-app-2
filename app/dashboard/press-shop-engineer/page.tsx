'use client'
import EngineerEscalationPage from '@/components/dashboard/engineer-escalation-page'

export default function PressShopEngineerPage() {
  return (
    <EngineerEscalationPage
      role="press_engineer"
      roleLabel="Press Shop Muhandis"
      shopFilter={['PRESS SHOP']}
      description="Press Shop sehidan DRR va GCA da chiqqan nuqsonlar"
    />
  )
}

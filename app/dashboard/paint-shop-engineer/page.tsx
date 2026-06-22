'use client'
import EngineerEscalationPage from '@/components/dashboard/engineer-escalation-page'

export default function PaintShopEngineerPage() {
  return (
    <EngineerEscalationPage
      role="paint_engineer"
      roleLabel="Paint Shop Muhandis"
      shopFilter={['PAINT SHOP']}
      description="Paint Shop sehidan DRR va GCA da chiqqan nuqsonlar"
    />
  )
}

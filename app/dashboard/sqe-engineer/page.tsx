'use client'
import EngineerEscalationPage from '@/components/dashboard/engineer-escalation-page'

export default function SQEEngineerPage() {
  return (
    <EngineerEscalationPage
      role="sqe_engineer"
      roleLabel="SQE Muhandis"
      shopFilter={['SQE']}
      description="Supplier Quality Engineer — ta'minotchilar sifat nazorati"
    />
  )
}

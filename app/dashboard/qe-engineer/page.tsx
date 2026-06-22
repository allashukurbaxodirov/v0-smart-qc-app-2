'use client'
import EngineerEscalationPage from '@/components/dashboard/engineer-escalation-page'

export default function QEEngineerPage() {
  return (
    <EngineerEscalationPage
      role="qe_engineer"
      roleLabel="QE Muhandis"
      shopFilter={['QE']}
      description="Quality Engineer — sifat muhandisi nuqsonlarni kuzatish"
    />
  )
}

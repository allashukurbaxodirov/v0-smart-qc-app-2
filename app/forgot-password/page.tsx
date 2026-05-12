'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center gap-4">
          <Link href="/login" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Orqaga</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Parolni tiklash</h1>
            <p className="text-sm text-muted-foreground">
              Email manzilingizni kiriting, tiklash havolasi yuboramiz
            </p>
          </div>

          {sent ? (
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
              <p className="text-sm text-success font-medium">
                Agar bu email tizimda ro&apos;yxatdan o&apos;tgan bo&apos;lsa, xabar yuboriladi.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email manzil</label>
                <Input
                  type="email"
                  placeholder="user@uzauto.uz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={!email}>
                Havolani yuborish
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

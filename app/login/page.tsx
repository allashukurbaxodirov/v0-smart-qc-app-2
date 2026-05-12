'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Xatolik yuz berdi')
        return
      }

      router.push(data.redirect)
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <header className="border-b border-border backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Orqaga</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              SQ
            </div>
            <span className="text-lg font-bold text-foreground">Smart QC</span>
          </div>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-8 space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-foreground">Tizimga kirish</h1>
              <p className="text-sm text-muted-foreground">
                Smart QC dashboard-ga kirishni amalga oshiring
              </p>
            </div>

            {error && (
              <div className="bg-critical/10 border border-critical/30 rounded-lg p-4">
                <p className="text-sm text-critical">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email manzil</label>
                <Input
                  type="email"
                  placeholder="user@uzauto.uz"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Parol</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border border-border" />
                  <span className="text-muted-foreground">Meni eslab qol</span>
                </label>
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Parolni unutdim?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Kirilmoqda...' : 'Kirish'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Muammo bo&apos;lsa tizim administratoriga murojaat qiling.
          </p>
        </div>
      </main>
    </div>
  )
}

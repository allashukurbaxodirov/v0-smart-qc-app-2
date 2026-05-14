'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Eye, EyeOff, BadgeCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [tabelNumber, setTabelNumber] = useState('')
  const [password, setPassword]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabelNumber: tabelNumber.trim().toUpperCase(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Xatolik yuz berdi')
        return
      }

      // Hard navigation — kontextlar yangi cookie bilan qayta yuklanadi
      window.location.href = data.redirect
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Orqaga</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              SQ
            </div>
            <span className="text-lg font-bold text-foreground">Smart QC</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl p-8 space-y-7 shadow-sm">

            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
                <BadgeCheck className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Tizimga kirish</h1>
              <p className="text-sm text-muted-foreground">
                Tabel raqami va parolingizni kiriting
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                <p className="text-sm text-rose-600 font-medium">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Tabel raqami */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Tabel raqami
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono font-semibold select-none">
                    #
                  </span>
                  <Input
                    type="text"
                    placeholder="T001"
                    value={tabelNumber}
                    onChange={e => { setTabelNumber(e.target.value); setError('') }}
                    required
                    className="pl-8 bg-background border-border font-mono tracking-widest uppercase text-base"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Parol */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Parol</label>
                <div className="relative">
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    required
                    className="bg-background border-border pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading || !tabelNumber || !password}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Tekshirilmoqda...
                  </span>
                ) : 'Kirish'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Tabel raqami va parol uchun administratorga murojaat qiling
          </p>
        </div>
      </main>
    </div>
  )
}

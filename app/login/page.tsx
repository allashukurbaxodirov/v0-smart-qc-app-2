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
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate login delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-8 space-y-8">
            {/* Title */}
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Tizimga kirish
              </h1>
              <p className="text-sm text-muted-foreground">
                Smart QC dashboard-ga kirishni amalga oshiring
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email manzil
                </label>
                <Input
                  type="email"
                  placeholder="user@uzauto.uz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background border-border"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Parol
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background border-border"
                />
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border border-border" />
                  <span className="text-muted-foreground">Meni eslab qol</span>
                </label>
                <a href="#" className="text-primary hover:underline">
                  Parolni unutdim?
                </a>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Kirilmoqda...' : 'Kirish'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">yoki</span>
              </div>
            </div>

            {/* Demo Access */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/dashboard')}
            >
              Demo ko&apos;rish
            </Button>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground">
              Hisob yaratish kerakmi?{' '}
              <a href="#" className="text-primary hover:underline font-medium">
                Ro&apos;yxatdan o&apos;tish
              </a>
            </p>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm text-foreground">
            <p className="font-semibold mb-2">Demo hisob ma&apos;lumotlari:</p>
            <p className="text-muted-foreground">Email: demo@uzauto.uz</p>
            <p className="text-muted-foreground">Parol: demo123</p>
          </div>
        </div>
      </main>
    </div>
  )
}

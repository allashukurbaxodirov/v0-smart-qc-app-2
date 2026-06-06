'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, BarChart3, Shield, Zap } from 'lucide-react'
import Link from 'next/link'

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              SQ
            </div>
            <span className="text-xl font-bold text-foreground">Smart QC</span>
          </div>
          <div className="text-sm text-muted-foreground">UzAuto Motors</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold text-foreground leading-tight">
                Avtomobil Ishlab Chiqarish Sifat Kontroli
              </h1>
              <p className="text-lg text-muted-foreground">
                UzAuto Motors uchun ilg&apos;or sifat nazorat tizimi. Real vaqtda ishlab chiqarish jarayonini kuzatish, defektlarni tahlil qilish va ishlab chiqarish samaradorligini oshirish.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Real-vaqt Analitika"
                description="Ishlab chiqarish ko&apos;rsatkichlarini real vaqtda kuzatish"
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Defekt Boshqaruvi"
                description="Avtomobil sifat muammolarini tuzatish va kuzatish"
              />
              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Samaradorlik"
                description="Ishlab chiqarish jarayonini optimallashtirish"
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6" />}
                title="Audit va Hisobot"
                description="To&apos;liq audit dori va batafsil hisobotlar"
              />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Link href="/login">
                <Button size="lg">
                  Kirish <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>Smart QC - UzAuto Motors Manufacturing Excellence Dashboard</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
      <div className="text-primary mb-2">{icon}</div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

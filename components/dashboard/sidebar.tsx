'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Home,
  TrendingUp,
  AlertTriangle,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Factory,
  ClipboardList,
  Clipboard,
  LayoutDashboard,
  Activity,
  Package,
  Crown,
  Database,
  Target,
  FileText,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface SidebarItem {
  label: string
  href: string
  icon: React.ReactNode
  section: string
}

const superAdminSidebarItems: SidebarItem[] = [
  {
    label: 'SuperAdmin Panel',
    href: '/dashboard/superadmin',
    icon: <Crown className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'Foydalanuvchilar',
    href: '/dashboard/superadmin',
    icon: <Users className="w-5 h-5" />,
    section: 'admin',
  },
  {
    label: 'WDPV Targetlar',
    href: '/dashboard/superadmin',
    icon: <Target className="w-5 h-5" />,
    section: 'admin',
  },
  {
    label: "Ma'lumotlar",
    href: '/dashboard/superadmin',
    icon: <Database className="w-5 h-5" />,
    section: 'admin',
  },
  {
    label: 'GCA Dashboard',
    href: '/dashboard/gca',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'DRR Dashboard',
    href: '/dashboard/drr',
    icon: <Activity className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'DRL Dashboard',
    href: '/dashboard/drl',
    icon: <Activity className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'PDI Dashboard',
    href: '/dashboard/pdi-admin',
    icon: <Activity className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'Rahbar paneli',
    href: '/dashboard/manager',
    icon: <LayoutDashboard className="w-5 h-5" />,
    section: 'dashboards',
  },
]

const adminSidebarItems: SidebarItem[] = [
  {
    label: 'GCA Dashboard',
    href: '/dashboard/gca',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'DRR Dashboard',
    href: '/dashboard/drr',
    icon: <Activity className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'DRL Dashboard',
    href: '/dashboard/drl',
    icon: <Activity className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'PDI Dashboard',
    href: '/dashboard/pdi-admin',
    icon: <Activity className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'Analitika',
    href: '/dashboard/analytics',
    icon: <TrendingUp className="w-5 h-5" />,
    section: 'analytics',
  },
  {
    label: 'Yuqori Defektlar',
    href: '/dashboard/top-defects',
    icon: <AlertTriangle className="w-5 h-5" />,
    section: 'analytics',
  },
  {
    label: 'Ishlab chiqarish',
    href: '/dashboard/workshops',
    icon: <Factory className="w-5 h-5" />,
    section: 'operations',
  },
  {
    label: 'Audit va Hisobotlar',
    href: '/dashboard/reports',
    icon: <ClipboardList className="w-5 h-5" />,
    section: 'admin',
  },
  {
    label: 'Feedback Report',
    href: '/dashboard/feedback-report',
    icon: <FileText className="w-5 h-5" />,
    section: 'admin',
  },
  {
    label: 'Foydalanuvchilar',
    href: '/dashboard/users',
    icon: <Users className="w-5 h-5" />,
    section: 'admin',
  },
  {
    label: 'Sozlamalar',
    href: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    section: 'admin',
  },
]

const gcaAuditorSidebarItems: SidebarItem[] = [
  {
    label: 'GCA Dashboard',
    href: '/dashboard/gca',
    icon: <Home className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'GCA Admin paneli',
    href: '/dashboard/gca-admin',
    icon: <Clipboard className="w-5 h-5" />,
    section: 'main',
  },
]

const cmmInspectorSidebarItems: SidebarItem[] = [
  {
    label: 'CMM Dashboard',
    href: '/dashboard/cmm',
    icon: <Home className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'CMM Admin paneli',
    href: '/dashboard/cmm-admin',
    icon: <Clipboard className="w-5 h-5" />,
    section: 'main',
  },
]

const d10InspectorSidebarItems: SidebarItem[] = [
  {
    label: 'D10 Dashboard',
    href: '/dashboard/d10',
    icon: <Home className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'D10 Admin paneli',
    href: '/dashboard/d10-admin',
    icon: <Clipboard className="w-5 h-5" />,
    section: 'main',
  },
]

const d20InspectorSidebarItems: SidebarItem[] = [
  {
    label: 'D20 Dashboard',
    href: '/dashboard/d20',
    icon: <Home className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'D20 Admin paneli',
    href: '/dashboard/d20-admin',
    icon: <Clipboard className="w-5 h-5" />,
    section: 'main',
  },
]

const gaEngineerSidebarItems: SidebarItem[] = [
  {
    label: 'GA Engineer paneli',
    href: '/dashboard/ga-engineer',
    icon: <Clipboard className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'Feedback Report',
    href: '/dashboard/feedback-report',
    icon: <FileText className="w-5 h-5" />,
    section: 'main',
  },
]

const weldingEngineerSidebarItems: SidebarItem[] = [
  {
    label: 'Welding Engineer paneli',
    href: '/dashboard/welding-engineer',
    icon: <Clipboard className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'Feedback Report',
    href: '/dashboard/feedback-report',
    icon: <FileText className="w-5 h-5" />,
    section: 'main',
  },
]

const drrInspectorSidebarItems: SidebarItem[] = [
  {
    label: 'DRR Tahlil',
    href: '/dashboard/drr',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'GSIP Import',
    href: '/dashboard/drr-admin',
    icon: <FileText className="w-5 h-5" />,
    section: 'main',
  },
]

const drlInspectorSidebarItems: SidebarItem[] = [
  {
    label: 'DRL Tahlil',
    href: '/dashboard/drl',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'GSIP Import',
    href: '/dashboard/drl-admin',
    icon: <FileText className="w-5 h-5" />,
    section: 'main',
  },
]

const pdiInspectorSidebarItems: SidebarItem[] = [
  {
    label: 'PDI Dashboard',
    href: '/dashboard/pdi-admin',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'Nuqson kiritish',
    href: '/dashboard/pdi-admin/entry',
    icon: <Clipboard className="w-5 h-5" />,
    section: 'main',
  },
]

const incomingInspectorSidebarItems: SidebarItem[] = [
  {
    label: 'Incoming Dashboard',
    href: '/dashboard/incoming',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'Incoming Control',
    href: '/dashboard/incoming-admin',
    icon: <Package className="w-5 h-5" />,
    section: 'main',
  },
]

const managerSidebarItems: SidebarItem[] = [
  {
    label: 'Umumiy Ko\'rinish',
    href: '/dashboard/manager',
    icon: <LayoutDashboard className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'Muhandislar tahlili',
    href: '/dashboard/engineer-analysis',
    icon: <Activity className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'GCA Dashboard',
    href: '/dashboard/gca',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'D10 Dashboard',
    href: '/dashboard/d10',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'D20 Dashboard',
    href: '/dashboard/d20',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'DRR Dashboard',
    href: '/dashboard/drr',
    icon: <Activity className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'DRL Dashboard',
    href: '/dashboard/drl',
    icon: <Activity className="w-5 h-5" />,
    section: 'dashboards',
  },
  {
    label: 'Incoming Control',
    href: '/dashboard/incoming',
    icon: <Package className="w-5 h-5" />,
    section: 'dashboards',
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userRole, setUserRole]   = useState<string>('admin')
  const [userName, setUserName]   = useState<string>('Admin User')
  const [userTabel, setUserTabel] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((user) => {
        if (user.role)        setUserRole(user.role)
        if (user.name)        setUserName(user.name)
        if (user.tabelNumber) setUserTabel(user.tabelNumber)
      })
      .catch(() => {})
  }, [])

  // Select sidebar items based on role
  let sidebarItems = adminSidebarItems
  if (userRole === 'superadmin') {
    sidebarItems = superAdminSidebarItems
  } else if (userRole === 'gca_auditor') {
    sidebarItems = gcaAuditorSidebarItems
  } else if (userRole === 'cmm_inspector') {
    sidebarItems = cmmInspectorSidebarItems
  } else if (userRole === 'd10_inspector') {
    sidebarItems = d10InspectorSidebarItems
  } else if (userRole === 'd20_inspector') {
    sidebarItems = d20InspectorSidebarItems
  } else if (userRole === 'ga_engineer') {
    sidebarItems = gaEngineerSidebarItems
  } else if (userRole === 'welding_engineer') {
    sidebarItems = weldingEngineerSidebarItems
  } else if (userRole === 'manager') {
    sidebarItems = managerSidebarItems
  } else if (userRole === 'drr_inspector') {
    sidebarItems = drrInspectorSidebarItems
  } else if (userRole === 'drl_inspector') {
    sidebarItems = drlInspectorSidebarItems
  } else if (userRole === 'pdi_inspector') {
    sidebarItems = pdiInspectorSidebarItems
  } else if (userRole === 'incoming_inspector') {
    sidebarItems = incomingInspectorSidebarItems
  }

  const groupedItems = {
    main: sidebarItems.filter((item) => item.section === 'main'),
    dashboards: sidebarItems.filter((item) => item.section === 'dashboards'),
    analytics: sidebarItems.filter((item) => item.section === 'analytics'),
    operations: sidebarItems.filter((item) => item.section === 'operations'),
    admin: sidebarItems.filter((item) => item.section === 'admin'),
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <Link href="/dashboard/manager" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-lg">
            SQ
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">Smart QC</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        {/* Main Section */}
        <SidebarSection title="Asosiy" items={groupedItems.main} isActive={isActive} />

        {/* Dashboards Section */}
        <SidebarSection title="Dashboardlar" items={groupedItems.dashboards} isActive={isActive} />

        {/* Analytics Section */}
        <SidebarSection title="Analitika" items={groupedItems.analytics} isActive={isActive} />

        {/* Operations Section */}
        <SidebarSection title="Ishlab chiqarish" items={groupedItems.operations} isActive={isActive} />

        {/* Admin Section */}
        <SidebarSection title="Boshqaruv" items={groupedItems.admin} isActive={isActive} />
      </div>

      {/* User Profile & Logout */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        {(() => {
          const ROLE_META: Record<string, { label: string; color: string }> = {
            superadmin:          { label: 'SUPERADMIN',        color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' },
            admin:               { label: 'Admin',             color: 'bg-blue-400/20 text-blue-200 border-blue-400/30' },
            manager:             { label: 'Rahbar',            color: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/30' },
            gca_auditor:         { label: 'GCA Auditor',       color: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30' },
            ga_engineer:         { label: 'GA Engineer',       color: 'bg-teal-400/20 text-teal-200 border-teal-400/30' },
            welding_engineer:    { label: 'Welding Engineer',  color: 'bg-sky-400/20 text-sky-200 border-sky-400/30' },
            drr_inspector:       { label: 'DRR Inspector',     color: 'bg-orange-400/20 text-orange-200 border-orange-400/30' },
            drl_inspector:       { label: 'DRL Inspector',     color: 'bg-amber-400/20 text-amber-200 border-amber-400/30' },
            d10_inspector:       { label: 'D10 Inspector',     color: 'bg-cyan-400/20 text-cyan-200 border-cyan-400/30' },
            d20_inspector:       { label: 'D20 Inspector',     color: 'bg-violet-400/20 text-violet-200 border-violet-400/30' },
            cmm_inspector:       { label: 'CMM Inspector',     color: 'bg-pink-400/20 text-pink-200 border-pink-400/30' },
            pdi_inspector:       { label: 'PDI Inspector',     color: 'bg-purple-400/20 text-purple-200 border-purple-400/30' },
            incoming_inspector:  { label: 'Incoming Control',  color: 'bg-rose-400/20 text-rose-200 border-rose-400/30' },
          }
          const meta   = ROLE_META[userRole] ?? { label: userRole, color: 'bg-white/10 text-white/70 border-white/20' }
          const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          return (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 border border-white/10">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate leading-tight">{userName}</p>
                {userTabel && (
                  <p className="text-[11px] text-white/50 font-mono leading-tight">Tabel: {userTabel}</p>
                )}
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.color}`}>
                  {userRole === 'superadmin' && <Crown className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />}
                  {meta.label}
                </span>
              </div>
            </div>
          )
        })()}
        <Button
          variant="outline"
          className="w-full justify-start"
          size="sm"
          onClick={async () => {
            await fetch('/api/auth', { method: 'DELETE' })
            router.push('/login')
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Chiqish
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 right-0 left-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-50">
        <Link href="/dashboard/manager" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            SQ
          </div>
          <span className="font-bold text-foreground">Smart QC</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-black/50 z-40">
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border overflow-y-auto">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}

function SidebarSection({
  title,
  items,
  isActive,
}: {
  title: string
  items?: SidebarItem[]
  isActive: (href: string) => boolean
}) {
  const safeItems = items ?? []

  if (safeItems.length === 0) {
    return null
  }

  return (
    <div className="mb-8 px-3">
      <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-4">
        {title}
      </p>
      <nav className="space-y-2">
        {safeItems.map((item) => (
          <Link
            key={`${item.href}__${item.label}`}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

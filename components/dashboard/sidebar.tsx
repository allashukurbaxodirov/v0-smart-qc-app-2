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

const adminSidebarItems: SidebarItem[] = [
  {
    label: 'Bosh sahifa',
    href: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    section: 'main',
  },
  {
    label: 'Umumiy dashboard',
    href: '/dashboard/main',
    icon: <BarChart3 className="w-5 h-5" />,
    section: 'main',
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
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('admin')
  const [userName, setUserName] = useState<string>('Admin User')
  const [userEmail, setUserEmail] = useState<string>('admin@uzauto.uz')
  const router = useRouter()

  useEffect(() => {
    // Read user info from cookie (set by /api/auth)
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      return match ? decodeURIComponent(match[2]) : null
    }
    const raw = getCookie('qc_session')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        setUserRole(user.role || 'admin')
        setUserName(user.name || 'User')
        setUserEmail(user.email || '')
      } catch {}
    }
  }, [])

  // Select sidebar items based on role
  let sidebarItems = adminSidebarItems
  if (userRole === 'gca_auditor') {
    sidebarItems = gcaAuditorSidebarItems
  } else if (userRole === 'cmm_inspector') {
    sidebarItems = cmmInspectorSidebarItems
  } else if (userRole === 'd10_inspector') {
    sidebarItems = d10InspectorSidebarItems
  } else if (userRole === 'd20_inspector') {
    sidebarItems = d20InspectorSidebarItems
  } else if (userRole === 'ga_engineer') {
    sidebarItems = gaEngineerSidebarItems
  }

  const groupedItems = {
    main: sidebarItems.filter((item) => item.section === 'main'),
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
        <Link href="/dashboard" className="flex items-center gap-3">
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

        {/* Analytics Section */}
        <SidebarSection title="Analitika" items={groupedItems.analytics} isActive={isActive} />

        {/* Operations Section */}
        <SidebarSection title="Ishlab chiqarish" items={groupedItems.operations} isActive={isActive} />

        {/* Admin Section */}
        <SidebarSection title="Boshqaruv" items={groupedItems.admin} isActive={isActive} />
      </div>

      {/* User Profile & Logout */}
      <div className="border-t border-sidebar-border p-6 space-y-4">
        <div className="px-3 py-3 rounded-lg bg-sidebar-primary/10">
          <p className="text-sm font-semibold text-sidebar-foreground">{userName}</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
          {userRole === 'gca_auditor' && (
            <p className="text-xs text-primary font-medium mt-1">GCA Auditor</p>
          )}
          {userRole === 'cmm_inspector' && (
            <p className="text-xs text-primary font-medium mt-1">CMM Inspector</p>
          )}
          {userRole === 'd10_inspector' && (
            <p className="text-xs text-primary font-medium mt-1">D10 Inspector</p>
          )}
          {userRole === 'd20_inspector' && (
            <p className="text-xs text-primary font-medium mt-1">D20 Inspector</p>
          )}
          {userRole === 'ga_engineer' && (
            <p className="text-xs text-primary font-medium mt-1">GA Engineer</p>
          )}
        </div>
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
        <Link href="/dashboard" className="flex items-center gap-2">
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
            key={item.href}
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

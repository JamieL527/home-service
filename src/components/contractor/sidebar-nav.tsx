'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Briefcase } from 'lucide-react'

const navItems = [
  { href: '/contractor/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/contractor/jobs',     label: 'Jobs',      icon: Briefcase },
]

export function ContractorSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="p-3 space-y-0.5">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-white/15 text-white'
                : 'text-blue-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Icon size={16} className="shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

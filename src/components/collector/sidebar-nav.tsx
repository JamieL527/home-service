'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, MapPin, PlusCircle } from 'lucide-react'

function isActive(href: string, pathname: string) {
  if (href === '/collector/leads/new') return pathname === href
  if (href === '/collector/leads') {
    return pathname.startsWith('/collector/leads') && pathname !== '/collector/leads/new'
  }
  return pathname === href
}

const navItems = [
  { href: '/collector/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/collector/leads',      label: 'My Leads',  icon: MapPin },
  { href: '/collector/leads/new',  label: 'Add Lead',  icon: PlusCircle },
]

export function CollectorSidebarNav() {
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
              isActive(item.href, pathname)
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

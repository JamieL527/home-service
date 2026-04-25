'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

function isActive(href: string, pathname: string) {
  if (href === '/collector/leads/new') return pathname === href
  if (href === '/collector/leads') {
    return pathname.startsWith('/collector/leads') && pathname !== '/collector/leads/new'
  }
  return pathname === href
}

const navItems = [
  { href: '/collector/dashboard', label: 'Dashboard' },
  { href: '/collector/leads', label: 'My Leads' },
  { href: '/collector/leads/new', label: 'Add Lead' },
]

export function CollectorSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="p-3 space-y-0.5">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive(item.href, pathname)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

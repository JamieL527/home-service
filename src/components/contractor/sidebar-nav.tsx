'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/contractor/overview', label: 'Overview' },
  { href: '/contractor/jobs', label: 'Jobs' },
]

export function ContractorSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="p-3 space-y-0.5">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === item.href
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

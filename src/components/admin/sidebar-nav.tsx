'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/evaluation', label: 'Evaluation & Sorting' },
  { href: '/admin/parking', label: 'Parking' },
  { href: '/admin/contractors', label: 'Contractor Approval' },
  { href: '/admin/contractor-management', label: 'Contractor Management' },
  { href: '/admin/users', label: 'User Management' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="p-3 space-y-0.5">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === item.href || pathname.startsWith(item.href + '/')
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

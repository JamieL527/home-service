'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MapPin, PlusCircle } from 'lucide-react'

const navItems = [
  { href: '/collector/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/collector/leads',     label: 'My Leads',  icon: MapPin },
  { href: '/collector/leads/new', label: 'Add Lead',  icon: PlusCircle },
]

function isActive(href: string, pathname: string) {
  if (href === '/collector/leads/new') return pathname === href
  if (href === '/collector/leads') {
    return pathname.startsWith('/collector/leads') && pathname !== '/collector/leads/new'
  }
  return pathname === href
}

export function CollectorBottomNav() {
  const pathname = usePathname()

  // hide on the new lead form — it has its own full-screen bottom bar
  if (pathname === '/collector/leads/new') return null

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a2e4a] border-t border-white/10 flex">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href, pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-semibold transition-colors ${
              active ? 'text-white' : 'text-blue-300'
            }`}
          >
            <Icon size={20} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

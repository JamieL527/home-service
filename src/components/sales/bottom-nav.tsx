'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp } from 'lucide-react'

const navItems = [
  { href: '/sales/pipeline', label: 'Pipeline', icon: TrendingUp },
]

export function SalesBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1a2e4a] border-t border-white/10 flex">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
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

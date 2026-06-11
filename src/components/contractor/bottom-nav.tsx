'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/contractor/jobs',    label: 'Jobs',    emoji: '🧰' },
  { href: '/contractor/profile', label: 'Profile', emoji: '👤' },
]

export function ContractorBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f1830] border-t border-white/10 flex">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-semibold transition-colors ${
              active ? 'text-white' : 'text-[#94a3b8]'
            }`}
          >
            <span className="text-xl leading-none">{item.emoji}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

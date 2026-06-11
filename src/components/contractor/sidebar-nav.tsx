'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/contractor/jobs',    label: 'Jobs',    emoji: '🧰' },
  { href: '/contractor/profile', label: 'Profile', emoji: '👤' },
]

export function ContractorSidebarNav({ offerCount = 0 }: { offerCount?: number }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col" style={{ gap: 4 }}>
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        const showBadge = item.href === '/contractor/jobs' && offerCount > 0
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center text-[14px] font-semibold transition-colors"
            style={{
              gap: 11,
              padding: '11px 13px',
              borderRadius: 10,
              color: active ? '#fff' : '#cbd5e1',
              background: active ? 'linear-gradient(100deg,#2563eb,#4f46e5)' : 'none',
            }}
          >
            <span>{item.emoji}</span>
            {item.label}
            {showBadge && (
              <span
                className="ml-auto flex items-center justify-center text-[11px] font-bold"
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 999,
                  padding: '0 5px',
                  background: active ? 'rgba(255,255,255,.25)' : '#fff',
                  color: active ? '#fff' : '#0f172a',
                }}
              >
                {offerCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

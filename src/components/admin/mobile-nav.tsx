'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Menu, X,
  LayoutDashboard, MapPin, ClipboardList, Archive,
  Briefcase, Megaphone, TrendingUp, Users, Settings,
  type LucideIcon,
} from 'lucide-react'

type Child = { href: string; label: string; icon: LucideIcon }
type NavItem =
  | { href: string; label: string; icon: LucideIcon; children?: never }
  | { label: string; icon: LucideIcon; href?: never; children: Child[] }

const navItems: NavItem[] = [
  { href: '/admin/dashboard',  label: 'Overview',        icon: LayoutDashboard },
  {
    label: 'Leads', icon: MapPin,
    children: [
      { href: '/admin/evaluation', label: 'Evaluation', icon: ClipboardList },
      { href: '/admin/parking',    label: 'Parking',    icon: Archive },
    ],
  },
  { href: '/admin/jobs',       label: 'Jobs',            icon: Briefcase },
  { href: '/admin/marketing',  label: 'Marketing',       icon: Megaphone },
  { href: '/admin/sales',      label: 'Sales',           icon: TrendingUp },
  { href: '/admin/users',      label: 'User Management', icon: Users },
  { href: '/admin/settings',   label: 'Settings',        icon: Settings },
]

export function AdminMobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const groupActive = (children: Child[]) => children.some(c => isActive(c.href))

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-[#1a2e4a]"
        aria-label="Open navigation"
      >
        <Menu size={22} />
        <span className="text-sm font-bold">Admin Panel</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-[#1a2e4a] flex flex-col shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 shrink-0">
              <span className="text-lg font-bold text-white">Admin Panel</span>
              <button
                onClick={() => setOpen(false)}
                className="text-blue-200 hover:text-white transition-colors"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {navItems.map((item) => {
                if (item.children) {
                  const active = groupActive(item.children)
                  const Icon = item.icon
                  return (
                    <div key={item.label}>
                      <div className={cn(
                        'flex items-center gap-2.5 px-3 py-2 text-sm font-medium',
                        active ? 'text-white' : 'text-blue-200'
                      )}>
                        <Icon size={16} className="shrink-0" />
                        {item.label}
                      </div>
                      <div className="ml-2 space-y-0.5">
                        {item.children.map(child => {
                          const ChildIcon = child.icon
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className={cn(
                                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive(child.href)
                                  ? 'bg-white/15 text-white'
                                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
                              )}
                            >
                              <ChildIcon size={15} className="shrink-0" />
                              {child.label}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                }

                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
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
          </div>
        </>
      )}
    </>
  )
}

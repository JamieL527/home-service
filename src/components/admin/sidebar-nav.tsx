'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Archive,
  Briefcase,
  Megaphone,
  TrendingUp,
  Users,
  Settings,
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
  { href: '/admin/jobs',        label: 'Jobs',       icon: Briefcase },
  { href: '/admin/marketing',   label: 'Marketing',       icon: Megaphone },
  { href: '/admin/sales',       label: 'Sales',           icon: TrendingUp },
  { href: '/admin/users',        label: 'User Management', icon: Users },
  { href: '/admin/settings',    label: 'Settings',        icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const groupActive = (children: Child[]) =>
    children.some(c => isActive(c.href))

  return (
    <nav className="p-3 space-y-0.5">
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
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
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
  )
}

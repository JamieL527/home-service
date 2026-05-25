'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" stroke="url(#ph-gradient1)" strokeWidth="3" fill="none" rx="8" />
      <circle cx="30" cy="30" r="4" fill="#00FFFF" />
      <circle cx="70" cy="30" r="4" fill="#FF6B00" />
      <circle cx="30" cy="70" r="4" fill="#FF6B00" />
      <circle cx="70" cy="70" r="4" fill="#00FFFF" />
      <circle cx="50" cy="50" r="5" fill="url(#ph-gradient2)" />
      <line x1="30" y1="30" x2="50" y2="50" stroke="#00FFFF" strokeWidth="2" opacity="0.6" />
      <line x1="70" y1="30" x2="50" y2="50" stroke="#FF6B00" strokeWidth="2" opacity="0.6" />
      <line x1="30" y1="70" x2="50" y2="50" stroke="#FF6B00" strokeWidth="2" opacity="0.6" />
      <line x1="70" y1="70" x2="50" y2="50" stroke="#00FFFF" strokeWidth="2" opacity="0.6" />
      <defs>
        <linearGradient id="ph-gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="100%" stopColor="#FF6B00" />
        </linearGradient>
        <linearGradient id="ph-gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00A8CC" />
          <stop offset="100%" stopColor="#FF6B00" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const NAV_LINKS = [
  { href: '/network', label: 'Our Network' },
  { href: '/market',  label: 'The Market' },
  { href: '/future',  label: 'Future' },
]

export function PublicHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-white/10 bg-[#0A0A12]/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-lg md:text-xl">Construction Market</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-semibold transition-colors ${
                  pathname === href ? 'text-[#00FFFF]' : 'text-gray-300 hover:text-[#00FFFF]'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="border-2 border-[#00FFFF] hover:bg-[#00FFFF]/10 text-[#00FFFF] px-4 py-2 rounded-lg transition-all font-semibold text-sm">
              Log in
            </button>
          </Link>
          <button
            className="md:hidden text-gray-300 hover:text-white transition-colors"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0A0A12]/95 px-4 py-4 flex flex-col gap-4">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`text-sm font-semibold transition-colors ${
                pathname === href ? 'text-[#00FFFF]' : 'text-gray-300 hover:text-[#00FFFF]'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}

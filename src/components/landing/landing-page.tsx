'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { Link2, Target, Radio, Headset, Shield, Network, Cpu, Activity, ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" stroke="url(#gradient1)" strokeWidth="3" fill="none" rx="8" />
      <circle cx="30" cy="30" r="4" fill="#00FFFF" />
      <circle cx="70" cy="30" r="4" fill="#FF6B00" />
      <circle cx="30" cy="70" r="4" fill="#FF6B00" />
      <circle cx="70" cy="70" r="4" fill="#00FFFF" />
      <circle cx="50" cy="50" r="5" fill="url(#gradient2)" />
      <line x1="30" y1="30" x2="50" y2="50" stroke="#00FFFF" strokeWidth="2" opacity="0.6" />
      <line x1="70" y1="30" x2="50" y2="50" stroke="#FF6B00" strokeWidth="2" opacity="0.6" />
      <line x1="30" y1="70" x2="50" y2="50" stroke="#FF6B00" strokeWidth="2" opacity="0.6" />
      <line x1="70" y1="70" x2="50" y2="50" stroke="#00FFFF" strokeWidth="2" opacity="0.6" />
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="100%" stopColor="#FF6B00" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00A8CC" />
          <stop offset="100%" stopColor="#FF6B00" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function StickyNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'backdrop-blur-xl bg-[#0A0A12]/80 border-b border-white/10 shadow-lg shadow-[#00FFFF]/5' : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-lg md:text-xl">Construction Market</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm">
            <Link href="/network" className="hover:text-[#00FFFF] transition-colors">Our Network</Link>
            <Link href="/market" className="hover:text-[#00FFFF] transition-colors">The Market</Link>
            <Link href="/future" className="hover:text-[#00FFFF] transition-colors">Future</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="border-2 border-[#00FFFF] hover:bg-[#00FFFF]/10 text-[#00FFFF] px-4 md:px-6 py-2 rounded-lg transition-all font-semibold text-sm md:text-base">
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
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0A0A12]/95 px-4 py-4 flex flex-col gap-4">
          <Link href="/network" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-gray-300 hover:text-[#00FFFF] transition-colors">Our Network</Link>
          <Link href="/market" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-gray-300 hover:text-[#00FFFF] transition-colors">The Market</Link>
          <Link href="/future" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-gray-300 hover:text-[#00FFFF] transition-colors">Future</Link>
        </div>
      )}
    </motion.nav>
  )
}

function SplitNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const nodes: { x: number; y: number; vx: number; vy: number; pulse: number }[] = []
    for (let i = 0; i < 60; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    let animationFrameId: number

    function animate() {
      if (!ctx || !canvas) return
      ctx.fillStyle = 'rgba(10, 10, 18, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const centerX = canvas.width / 2

      nodes.forEach((node, i) => {
        node.x += node.vx
        node.y += node.vy
        node.pulse += 0.02
        if (node.x < 0) node.x = canvas.width
        if (node.x > canvas.width) node.x = 0
        if (node.y < 0) node.y = canvas.height
        if (node.y > canvas.height) node.y = 0

        const nodeColor = node.x < centerX ? '0, 255, 255' : '255, 59, 59'

        nodes.forEach((otherNode, j) => {
          if (i === j) return
          const dx = node.x - otherNode.x
          const dy = node.y - otherNode.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.3
            const avgX = (node.x + otherNode.x) / 2
            ctx.strokeStyle = avgX < centerX ? `rgba(0, 255, 255, ${opacity})` : `rgba(255, 59, 59, ${opacity})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(otherNode.x, otherNode.y)
            ctx.stroke()
          }
        })

        const pulseSize = 2 + Math.sin(node.pulse) * 1
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulseSize * 4)
        gradient.addColorStop(0, `rgba(${nodeColor}, 0.9)`)
        gradient.addColorStop(0.5, `rgba(${nodeColor}, 0.5)`)
        gradient.addColorStop(1, `rgba(${nodeColor}, 0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, pulseSize * 4, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />
}

function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0A0A12]">
      <div className="absolute inset-0 z-0 grid md:grid-cols-2">
        <div className="relative">
          <div
            className="absolute inset-0 bg-cover bg-center grayscale opacity-20"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920')" }}
          />
          <div className="absolute inset-0 bg-[#0A0A12]/85" />
        </div>
        <div className="relative">
          <div
            className="absolute inset-0 bg-cover bg-center grayscale opacity-20"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577332855062-2ba7d19c9591?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920')" }}
          />
          <div className="absolute inset-0 bg-[#0A0A12]/85" />
        </div>
      </div>

      <div className="absolute inset-0 z-[1]">
        <SplitNetworkBackground />
      </div>

      <div className="relative z-10 w-full h-full min-h-[90vh] grid md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col items-center justify-center px-4 md:px-12 py-20 text-center col-span-2"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider text-white leading-tight">
            Dominate the Toronto Construction Market
          </h1>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#05050A] to-transparent z-[2]" />
    </section>
  )
}

function ServiceCard({ service, delay }: { service: { icon: React.ElementType; secondaryIcon: React.ElementType; title: string; description: string; href?: string }; delay: number }) {
  const Icon = service.icon
  const SecondaryIcon = service.secondaryIcon
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={`relative p-8 rounded-2xl bg-gradient-to-br from-[#1A1D29] to-[#0F1118] border border-[#00FFFF]/30 shadow-lg shadow-[#00FFFF]/20 transition-all duration-300 hover:scale-105 hover:border-[#00FFFF]/50 h-full${service.href ? ' cursor-pointer' : ''}`}
    >
      <div className="relative mb-6 flex items-center justify-center">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <Icon className="w-10 h-10 text-[#00FFFF] absolute z-10" strokeWidth={2} />
          <SecondaryIcon className="w-8 h-8 text-[#00FFFF]/40 absolute bottom-0 right-0" strokeWidth={2} />
        </div>
      </div>
      <h3 className="text-2xl font-[family-name:var(--font-teko)] font-bold uppercase mb-4 tracking-wider text-white">
        {service.title}
      </h3>
      <p className="text-gray-300 leading-relaxed">{service.description}</p>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00FFFF]/5 to-transparent pointer-events-none" />
    </motion.div>
  )
  return service.href ? <Link href={service.href} className="block h-full">{card}</Link> : card
}

function ServiceOfferings() {
  const services = [
    {
      icon: Headset,
      secondaryIcon: Shield,
      title: 'DIRECT OUTREACH & Q.C.',
      description: 'Your outsourced sales department. We find active builders who need your trade, call them on your behalf, represent you at job-site meetings, and manage the deal through to a signed agreement.',
      href: '/register',
    },
    {
      icon: Network,
      secondaryIcon: Link2,
      title: 'REFERRAL NETWORK',
      description: 'Zero-commitment lead access. We connect you directly with active builders and job sites through our network — you pay only when a referred deal closes.',
      href: '/register?referral=true',
    },
    {
      icon: Radio,
      secondaryIcon: Target,
      title: 'DIGITAL FOUNDATION',
      description: 'A polished, professional brand and website — built once, yours to keep. We design your logo, build your website, and set up your digital storefront.',
    },
  ]

  return (
    <section id="service-offerings" className="py-20 px-4 md:px-8 bg-[#2C3E50]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-teko)] font-bold mb-4 uppercase tracking-wider">
            SERVICE OFFERINGS
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Comprehensive construction market penetration solutions designed for Toronto builders and trades.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {services.map((service, index) => (
            <ServiceCard key={index} service={service} delay={index * 0.1} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <Link href="/register">
            <motion.button
              className="bg-[#00FFFF] text-[#05050A] px-10 py-5 rounded-lg font-semibold text-xl shadow-lg shadow-[#00FFFF]/40 hover:shadow-[#00FFFF]/60 hover:bg-[#00FFFF]/90 transition-all uppercase tracking-wider"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Request Pricing
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

function DeploymentModules() {
  const modules = [
    {
      icon: Cpu,
      title: 'AI-Powered Platform',
      description: 'Intelligent tools work behind every job — matching you to the right leads, reading site photos, and surfacing what matters. Technology doing the heavy lifting so you don\'t have to.',
    },
    {
      icon: Activity,
      title: 'Live Market Data',
      description: 'Our database of active Toronto jobsites is swept and updated every quarter. You\'re always working from what\'s happening now — not last year\'s list.',
    },
    {
      icon: Network,
      title: 'Connected Network',
      description: 'We put you in front of the right people across the construction network — builders, trades, and decision-makers actively moving on projects.',
    },
    {
      icon: ArrowRight,
      title: 'Less Friction, Start to Finish',
      description: 'From first introduction to signed agreement and payment, the whole deal runs in one place. Less back-and-forth, fewer dropped balls, a smoother path for everyone involved.',
    },
  ]

  return (
    <section id="modules" className="py-20 px-4 md:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Our Edge</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            What sets Construction Market apart for Toronto builders and trades.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((module, index) => (
            <GlassCard key={index} delay={index * 0.1}>
              <module.icon className="w-10 h-10 text-[#FF6B00] mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold mb-3">{module.title}</h3>
              <p className="text-gray-400 leading-relaxed">{module.description}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}

function DemandTeaser() {
  return (
    <section className="py-20 px-4 md:px-8 bg-gradient-to-b from-transparent via-[#0A0A12]/50 to-transparent relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF6B00]/10 via-transparent to-transparent" />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Custom Home Builders & Project Managers
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Join Toronto's most comprehensive network of verified, pre-qualified GTA trades and procurement specialists.
          </p>
          <Link href="/register">
            <motion.button
              className="bg-gradient-to-r from-[#00FFFF] to-[#00FFFF]/80 text-[#05050A] px-8 py-4 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/30 hover:shadow-[#00FFFF]/50 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Apply Now
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0A0A12]/50 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Logo className="w-8 h-8" />
              <span className="font-bold text-lg">Construction Market</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              The central nervous system of Toronto's residential construction market.
            </p>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-4">Backed by ON AIR</p>
            <div className="flex gap-4 text-xs text-gray-500">
              <Link href="/terms" className="hover:text-[#00FFFF] transition-colors">Terms & Conditions</Link>
              <span>·</span>
              <Link href="/terms#privacy" className="hover:text-[#00FFFF] transition-colors">Privacy Policy</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>111 Sheppard Ave West</li>
              <li>North York, ON</li>
              <li className="pt-2">
                <a href="tel:437-450-3116" className="hover:text-[#00FFFF] transition-colors">437-450-3116</a>
              </li>
              <li>
                <a href="mailto:build@constructionmarket.ca" className="hover:text-[#00FFFF] transition-colors">build@constructionmarket.ca</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

function GlassCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-[#00FFFF]/50 transition-all duration-300 shadow-lg hover:shadow-[#00FFFF]/20"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00FFFF]/0 to-[#FF6B00]/0 group-hover:from-[#00FFFF]/5 group-hover:to-[#FF6B00]/5 transition-all duration-300" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sans font-medium overflow-x-hidden">
      {/* Announcement Bar */}
      <div className="bg-[#0A0A12] border-b border-white/5 py-2 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-xs md:text-sm text-gray-400">
          <div>Toronto's #1 Construction Intelligence Network</div>
          <div className="flex gap-4">
            <a href="tel:437-450-3116" className="hover:text-[#00FFFF] transition-colors">Call Sales: 437-450-3116</a>
            <span className="hidden md:inline">|</span>
            <a href="mailto:build@constructionmarket.ca" className="hover:text-[#00FFFF] transition-colors">build@constructionmarket.ca</a>
          </div>
        </div>
      </div>

      <StickyNav />
      <HeroSection />
      <ServiceOfferings />
      <DeploymentModules />
      <DemandTeaser />
      <Footer />
    </div>
  )
}

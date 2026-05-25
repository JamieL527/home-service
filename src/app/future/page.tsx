'use client'

import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Eye, Settings, Shield, Package, Users, Briefcase } from 'lucide-react'
import { PublicHeader } from '@/components/landing/public-header'

function EcosystemVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    const streams = [
      { angle: 0,   color: '0, 255, 255', offset: 0 },
      { angle: 60,  color: '255, 59, 59', offset: 0 },
      { angle: 120, color: '0, 255, 255', offset: 0 },
      { angle: 180, color: '255, 59, 59', offset: 0 },
      { angle: 240, color: '0, 255, 255', offset: 0 },
      { angle: 300, color: '255, 59, 59', offset: 0 },
    ]

    let animationFrameId: number

    function animate() {
      if (!ctx || !canvas) return
      ctx.fillStyle = 'rgba(26, 29, 41, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.strokeRect(centerX - 40, centerY - 40, 80, 80)

      streams.forEach((stream) => {
        stream.offset += 2
        if (stream.offset > 300) stream.offset = 0

        const rad = (stream.angle * Math.PI) / 180
        const startX = centerX + Math.cos(rad) * 300
        const startY = centerY + Math.sin(rad) * 300
        const endX = centerX + Math.cos(rad) * 60
        const endY = centerY + Math.sin(rad) * 60

        const gradient = ctx.createLinearGradient(startX, startY, endX, endY)
        gradient.addColorStop(0, `rgba(${stream.color}, 0)`)
        gradient.addColorStop(0.5, `rgba(${stream.color}, 0.6)`)
        gradient.addColorStop(1, `rgba(${stream.color}, 0)`)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        const px = startX + (endX - startX) * (stream.offset / 300)
        const py = startY + (endY - startY) * (stream.offset / 300)
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 8)
        pg.addColorStop(0, `rgba(${stream.color}, 1)`)
        pg.addColorStop(1, `rgba(${stream.color}, 0)`)
        ctx.fillStyle = pg
        ctx.beginPath()
        ctx.arc(px, py, 8, 0, Math.PI * 2)
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
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', handleResize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 opacity-40" />
}

function EcosystemCard({
  icon: Icon, title, subtitle, description, accentColor, delay,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  description: string
  accentColor: 'cyan' | 'red'
  delay: number
}) {
  const borderColor = accentColor === 'cyan' ? 'border-[#00FFFF]/50' : 'border-[#FF3B3B]/50'
  const iconColor = accentColor === 'cyan' ? 'text-[#00FFFF]' : 'text-[#FF3B3B]'
  const glowColor = accentColor === 'cyan' ? 'shadow-[#00FFFF]/20' : 'shadow-[#FF3B3B]/20'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={`p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border ${borderColor} ${glowColor} shadow-lg transition-all duration-300 hover:scale-105`}
    >
      <div className="flex items-center justify-center mb-6">
        <Icon className={`w-12 h-12 ${iconColor}`} strokeWidth={1.5} />
      </div>
      <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">{subtitle}</p>
      <h3 className="text-2xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider mb-4 text-white">
        {title}
      </h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </motion.div>
  )
}

export default function FuturePage() {
  return (
    <div className="min-h-screen bg-[#1A1D29] text-white font-medium">
      <PublicHeader />

      <section className="relative py-32 px-4 md:px-8 overflow-hidden bg-gradient-to-br from-[#0A0A12] via-[#1A1D29] to-[#0A0A12]">
        <div className="absolute inset-0 z-0">
          <EcosystemVisualization />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-6xl md:text-8xl font-[family-name:var(--font-teko)] font-bold mb-6 tracking-wider uppercase text-white">
              THE ALL-IN-ONE ECOSYSTEM
            </h1>
            <p className="text-2xl md:text-3xl font-medium">
              <span className="text-[#00FFFF]">Moving beyond networking.</span>{' '}
              <span className="text-[#FF3B3B]">Building the ultimate digital infrastructure</span>{' '}
              <span className="text-gray-300">for the entire construction lifecycle.</span>
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-[#0F1118]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-6xl font-[family-name:var(--font-teko)] font-bold mb-8 uppercase tracking-wider text-white">
              FROM ON AIR INTELLIGENCE TO COMPLETE MARKET EXECUTION
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              The "ON AIR Phase" was about establishing the foundation: data collection, market analysis, and intelligent networking. But data without execution is just theory. The future of Construction Market is a fully integrated, all-in-one platform. We are eliminating the fragmented software stack and bringing every stakeholder into a single, unified digital environment.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-[#1A1D29]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider text-white mb-4">
              THE 360° ECOSYSTEM
            </h2>
            <p className="text-gray-400 text-lg">Six stakeholders. One unified platform.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <EcosystemCard icon={Eye} title="OWNERS" subtitle="Owners & Developers" description="Unlock high-level project oversight and centralized vendor compliance." accentColor="red" delay={0} />
            <EcosystemCard icon={Settings} title="BUILDERS" subtitle="Custom Builders" description="Join the Phase 2 Waitlist. Secure early access to our verified pool of top-tier trades and suppliers." accentColor="red" delay={0.1} />
            <EcosystemCard icon={Shield} title="CREDITORS" subtitle="Creditors & Lenders" description="Leverage verified network data to mitigate risk and streamline project financing." accentColor="red" delay={0.2} />
            <EcosystemCard icon={Package} title="SUPPLIERS" subtitle="Suppliers & Manufacturers" description="Digitize your inventory presence and position your materials directly in front of enterprise demand." accentColor="cyan" delay={0.3} />
            <EcosystemCard icon={Users} title="TRADES" subtitle="Trade Contractors" description="Claim your verified digital profile to secure priority placement for upcoming major project pipelines." accentColor="cyan" delay={0.4} />
            <EcosystemCard icon={Briefcase} title="LABOR" subtitle="The Labor Force" description="Access the central hub for verified, high-paying operational opportunities across the GTA." accentColor="cyan" delay={0.5} />
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-gradient-to-r from-[#00FFFF]/10 via-[#0F1118] to-[#FF3B3B]/10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-6xl font-[family-name:var(--font-teko)] font-bold mb-8 uppercase tracking-wider text-white">
              DIGITAL SYNERGY SAVES CAPITAL
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              In construction, time is the ultimate currency. By eliminating analog communication lag, manual data entry, and isolated supply chains, the Construction Market ecosystem physically accelerates the build timeline. When the Creditor, Builder, and Supplier operate on the exact same real-time data, friction disappears, material waste drops, and project profitability skyrockets.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-[#0A0A12]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-6xl font-[family-name:var(--font-teko)] font-bold mb-6 uppercase">
              Join The Future
            </h2>
            <p className="text-gray-300 mb-10 text-lg">
              Be part of the unified construction intelligence platform.
            </p>
            <Link href="/register">
              <motion.button
                className="bg-[#00FFFF] text-[#05050A] px-10 py-5 rounded-lg font-semibold text-xl shadow-lg shadow-[#00FFFF]/30 hover:shadow-[#00FFFF]/50 hover:bg-[#00FFFF]/90 transition-all uppercase tracking-wider"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Apply Now
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

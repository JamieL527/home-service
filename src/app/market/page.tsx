'use client'

import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { PublicHeader } from '@/components/landing/public-header'

function TorontoNetworkOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    const width = canvas.width / 2
    const height = canvas.height / 2

    const nodes: { x: number; y: number; pulse: number; color: string }[] = []
    for (let i = 0; i < 30; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        pulse: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? 'cyan' : 'red',
      })
    }

    let animationFrameId: number

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, width, height)

      ctx.lineWidth = 2
      nodes.forEach((node, i) => {
        nodes.forEach((other, j) => {
          if (i < j) {
            const dx = node.x - other.x
            const dy = node.y - other.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            if (distance < 200) {
              const opacity = (1 - distance / 200) * 0.4
              ctx.strokeStyle = node.color === 'cyan'
                ? `rgba(0, 255, 255, ${opacity})`
                : `rgba(255, 59, 59, ${opacity})`
              ctx.beginPath()
              ctx.moveTo(node.x, node.y)
              ctx.lineTo(other.x, other.y)
              ctx.stroke()
            }
          }
        })
      })

      nodes.forEach((node) => {
        node.pulse += 0.02
        const pulseSize = 4 + Math.sin(node.pulse) * 2
        const color = node.color === 'cyan' ? '0, 255, 255' : '255, 59, 59'
        const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulseSize * 2)
        g.addColorStop(0, `rgba(${color}, 1)`)
        g.addColorStop(0.5, `rgba(${color}, 0.6)`)
        g.addColorStop(1, `rgba(${color}, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(node.x, node.y, pulseSize * 2, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
    }
    window.addEventListener('resize', handleResize)
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', handleResize) }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
}

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-[#1A1D29] text-white font-medium">
      <PublicHeader />

      <section className="relative py-32 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center grayscale"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920')" }} />
          <div className="absolute inset-0 bg-[#1A1D29]/85" />
        </div>
        <div className="absolute inset-0 z-[1]">
          <TorontoNetworkOverlay />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-6xl md:text-8xl font-[family-name:var(--font-teko)] font-bold mb-6 tracking-wider uppercase text-white">
              THE GTA BLUEPRINT
            </h1>
            <p className="text-2xl md:text-3xl text-[#00FFFF] font-medium">
              We are mapping the most critical supply chains in the Greater Toronto Area. By unifying fragmented industry data, we are building the foundation for the next generation of construction logistics.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-[#0F1118]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <h3 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider text-white">
                OWNING THE GTA SINGLE-FAMILY SECTOR
              </h3>
              <p className="text-gray-300 leading-relaxed text-lg">
                We don't do commercial high-rises. We focus surgically on the Toronto single-family and custom home market. This sector is massive, highly lucrative, and deeply fragmented. By centralizing the supply chain and vetting the trades specifically for residential builds, we remove the friction that kills profit margins for custom builders.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-4"
            >
              <h3 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider text-white">
                PROPRIETARY MARKET INTELLIGENCE
              </h3>
              <p className="text-gray-300 leading-relaxed text-lg">
                Our ON AIR recorded database tracked a massive industry shift from 2023 to 2024. Builders relying on isolated, traditional sourcing faced compounding material delays and labor shortages. Conversely, projects executing within a unified, digital network saw a drastic reduction in site downtime. The data is absolute: isolation costs money; integration accelerates the build.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider text-white">
                CONSTRUCTION IS A RELATIONSHIP ASSET
              </h3>
              <p className="text-gray-300 leading-relaxed text-lg">
                At its core, construction is not just about moving dirt and wood—it is about the speed of your network. We are not just a software tool; we are a curated ecosystem. When you connect elite demand (builders) with verified supply (trades) under an immutable accountability ledger, the entire market moves faster. Your network is your net worth.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-gradient-to-br from-[#FF3B3B]/20 to-[#0F1118]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="p-12 rounded-2xl bg-gradient-to-br from-[#FF3B3B]/10 to-transparent border border-[#FF3B3B]/30"
          >
            <h2 className="text-4xl md:text-6xl font-[family-name:var(--font-teko)] font-bold mb-6 uppercase tracking-wider text-white">
              PHASE 2: ENTERPRISE SCALING
            </h2>
            <p className="text-gray-200 text-lg leading-relaxed">
              Upon completion of our GTA supply-side infrastructure, Construction Market will deploy our proprietary central node across Canada, granting priority builders instant access to our verified vendor network.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-[#1A1D29]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-6xl font-[family-name:var(--font-teko)] font-bold mb-6 uppercase">
              Join The Network
            </h2>
            <p className="text-gray-300 mb-10 text-lg">
              Apply to become part of Toronto's most comprehensive construction intelligence platform.
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

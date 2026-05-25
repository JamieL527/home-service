'use client'

import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import Link from 'next/link'
import { PublicHeader } from '@/components/landing/public-header'

function GTANetworkMap() {
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

    const nodes: { x: number; y: number; label: string; pulse: number }[] = [
      { x: width * 0.5,  y: height * 0.4,  label: 'Downtown',   pulse: 0 },
      { x: width * 0.35, y: height * 0.3,  label: 'North York', pulse: 0.5 },
      { x: width * 0.3,  y: height * 0.55, label: 'Etobicoke',  pulse: 1 },
      { x: width * 0.65, y: height * 0.5,  label: 'Scarborough',pulse: 1.5 },
      { x: width * 0.45, y: height * 0.65, label: 'Mississauga',pulse: 2 },
      { x: width * 0.6,  y: height * 0.3,  label: 'Markham',    pulse: 2.5 },
    ]

    const activeNodes: { x: number; y: number; alpha: number }[] = []
    for (let i = 0; i < 200; i++) {
      activeNodes.push({ x: Math.random() * width, y: Math.random() * height, alpha: Math.random() })
    }

    let animationFrameId: number

    function animate() {
      if (!ctx || !canvas) return
      ctx.fillStyle = '#0F1118'
      ctx.fillRect(0, 0, width, height)

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)'
      ctx.lineWidth = 1
      nodes.forEach((node, i) => {
        nodes.forEach((other, j) => {
          if (i < j) {
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        })
      })

      activeNodes.forEach((node) => {
        node.alpha += (Math.random() - 0.5) * 0.05
        node.alpha = Math.max(0, Math.min(1, node.alpha))
        const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 3)
        g.addColorStop(0, `rgba(0, 255, 255, ${node.alpha})`)
        g.addColorStop(1, 'rgba(0, 255, 255, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      nodes.forEach((node) => {
        node.pulse += 0.03
        const pulseSize = 8 + Math.sin(node.pulse) * 3
        const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulseSize)
        g.addColorStop(0, 'rgba(0, 255, 255, 1)')
        g.addColorStop(0.5, 'rgba(0, 255, 255, 0.5)')
        g.addColorStop(1, 'rgba(0, 255, 255, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#00FFFF'
        ctx.font = "12px 'Inter', sans-serif"
        ctx.textAlign = 'center'
        ctx.fillText(node.label, node.x, node.y - 15)
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <canvas ref={canvasRef} className="w-full h-[500px] rounded-2xl border border-white/10" style={{ background: '#0F1118' }} />
    </motion.div>
  )
}

function AIChatBox() {
  const [message, setMessage] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setShowCursor(p => !p), 530)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="mt-12"
    >
      <div className="max-w-3xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-[family-name:var(--font-teko)] font-bold mb-6 text-center uppercase tracking-wider">
          Let's get down, What are you looking for
        </h3>
        <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFFF]/20 to-[#00FFFF]/5 border border-[#00FFFF]/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#00FFFF] animate-pulse" />
            </div>
            <span className="text-sm text-gray-400 uppercase tracking-wider">AI Assistant</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder=""
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-12 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 focus:border-[#00FFFF]/50 transition-all"
            />
            {message === '' && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-gray-500">Ask about trades, suppliers, availability</span>
                <span className={`inline-block w-0.5 h-5 bg-[#00FFFF] ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            )}
            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#00FFFF]/10 hover:bg-[#00FFFF]/20 border border-[#00FFFF]/30 flex items-center justify-center transition-all group">
              <Send className="w-4 h-4 text-[#00FFFF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Find electricians in North York', 'Material suppliers downtown', 'Plumbing contractors available this week'].map((s, i) => (
              <button key={i} onClick={() => setMessage(s)} className="text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#00FFFF]/50 hover:bg-[#00FFFF]/5 text-gray-400 hover:text-[#00FFFF] transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function NetworkPage() {
  return (
    <div className="min-h-screen bg-[#1A1D29] text-white font-medium">
      <PublicHeader />

      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center grayscale opacity-20"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1577332855062-2ba7d19c9591?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920')" }} />
          <div className="absolute inset-0 bg-[#1A1D29]/90" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1D29]/95 via-[#1A1D29]/85 to-[#1A1D29]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-teko)] font-bold mb-6 tracking-wider uppercase">
              A Data-Driven Trades Network
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              We are connecting Toronto's most trusted builders with a curated network of vetted trades and suppliers.
              It's not just a directory; it's an intelligent procurement engine.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-[#0F1118]">
        <div className="max-w-7xl mx-auto">
          <GTANetworkMap />
          <AIChatBox />
        </div>
      </section>

      <section className="py-20 px-4 md:px-8 bg-[#0F1118]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-teko)] font-bold mb-6 uppercase">
            Join the Network
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            Become part of Toronto's most comprehensive construction intelligence platform.
          </p>
          <Link href="/register">
            <motion.button
              className="bg-[#00FFFF] text-[#05050A] px-8 py-4 rounded-lg font-semibold text-lg shadow-lg shadow-[#00FFFF]/30 hover:shadow-[#00FFFF]/50 hover:bg-[#00FFFF]/90 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Apply Now
            </motion.button>
          </Link>
        </div>
      </section>
    </div>
  )
}

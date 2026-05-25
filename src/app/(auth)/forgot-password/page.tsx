'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PublicHeader } from '@/components/landing/public-header'

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 focus:border-[#00FFFF]/50 transition-all text-sm'

const labelClass = 'block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = (new FormData(e.currentTarget).get('email') as string).trim().toLowerCase()
    setPending(true)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/api/auth/callback?next=/reset-password`
    await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    // Always show success — never reveal whether the email exists
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#05050A] text-white font-medium">
        <PublicHeader />
        <div className="flex items-center justify-center py-20 px-4">
          <div className="w-full max-w-sm bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
            <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider mb-3">Check Your Email</h1>
            <p className="text-sm text-gray-400">
              We sent a password reset link to your email address. Please check your inbox.
            </p>
            <Link href="/login" className="mt-6 inline-block text-sm text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-sm bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider">Forgot Password</h1>
            <p className="mt-1 text-sm text-gray-400">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-[#00FFFF] text-[#05050A] py-3 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/20 hover:shadow-[#00FFFF]/40 hover:bg-[#00FFFF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            <Link href="/login" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

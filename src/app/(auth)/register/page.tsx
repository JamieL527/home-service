'use client'

import { useActionState, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/app/actions/auth'
import { PasswordStrength } from '@/components/ui/password-strength'
import { isPasswordValid } from '@/lib/validations/password'
import { PublicHeader } from '@/components/landing/public-header'

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 focus:border-[#00FFFF]/50 transition-all text-sm'

const labelClass = 'block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5'

function RegisterForm() {
  const [state, action, isPending] = useActionState(register, null)
  const [password, setPassword] = useState('')
  const searchParams = useSearchParams()
  const isReferral = searchParams.get('referral') === 'true'

  const canSubmit = !isPending && isPasswordValid(password)

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider">Create Account</h1>
        <p className="mt-1 text-sm text-gray-400">Register to get started as a contractor</p>
      </div>

      <form action={action} className="space-y-5">
        <input type="hidden" name="registrationType" value={isReferral ? 'referral' : 'direct'} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className={labelClass}>First Name</label>
            <input id="firstName" name="firstName" placeholder="Jane" className={inputClass} />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>Last Name</label>
            <input id="lastName" name="lastName" placeholder="Smith" className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            className={inputClass}
          />
          <div className="mt-2">
            <PasswordStrength password={password} />
          </div>
        </div>

        {state && 'error' in state && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-[#00FFFF] text-[#05050A] py-3 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/20 hover:shadow-[#00FFFF]/40 hover:bg-[#00FFFF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-sm">
          <Suspense fallback={<div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl h-96" />}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useActionState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { PublicHeader } from '@/components/landing/public-header'

const URL_ERRORS: Record<string, string> = {
  account_suspended: 'Your account has been suspended. Please contact an administrator.',
  account_rejected:  'Your account has been rejected. Please contact support.',
}

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 focus:border-[#00FFFF]/50 transition-all text-sm'

const labelClass = 'block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5'

function LoginForm() {
  const [state, action, isPending] = useActionState(login, null)
  const searchParams = useSearchParams()
  const urlError = URL_ERRORS[searchParams.get('error') ?? '']

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-sm">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider">Sign In</h1>
              <p className="mt-1 text-sm text-gray-400">Enter your account credentials</p>
            </div>

            <form action={action} className="space-y-5">
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
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>

              {(urlError || state?.error) && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {urlError ?? state?.error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#00FFFF] text-[#05050A] py-3 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/20 hover:shadow-[#00FFFF]/40 hover:bg-[#00FFFF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isPending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-400">
              <Link href="/forgot-password" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
                Forgot password?
              </Link>
              <span>
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
                  Register
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

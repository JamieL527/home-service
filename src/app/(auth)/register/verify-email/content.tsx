'use client'

import { useActionState } from 'react'
import { resendVerificationEmail } from '@/app/actions/auth'
import { PublicHeader } from '@/components/landing/public-header'

export function VerifyEmailContent({ email }: { email: string }) {
  const [state, action, isPending] = useActionState(resendVerificationEmail, null)

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-sm bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
          <div className="mb-4 text-4xl">📧</div>
          <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider mb-3">Check Your Email</h1>
          <p className="text-sm text-gray-400">
            We&apos;ve sent a verification link to{' '}
            <span className="font-medium text-white">{email}</span>.
            Please click the link to verify your account and continue setting up your profile.
          </p>

          {state?.error && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="mt-4 rounded-lg border border-[#00FFFF]/30 bg-[#00FFFF]/10 px-3 py-2 text-sm text-[#00FFFF]">
              Verification email resent. Please check your inbox.
            </p>
          )}

          <form action={action} className="mt-6">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              disabled={isPending}
              className="w-full border border-[#00FFFF]/50 text-[#00FFFF] py-3 rounded-lg font-semibold hover:bg-[#00FFFF]/10 transition-all disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Resend email'}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500">
            Once verified, you&apos;ll be redirected to complete your business profile.
          </p>
        </div>
      </div>
    </div>
  )
}

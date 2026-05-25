'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PasswordStrength } from '@/components/ui/password-strength'
import { isPasswordValid } from '@/lib/validations/password'
import { PublicHeader } from '@/components/landing/public-header'

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 focus:border-[#00FFFF]/50 transition-all text-sm'

const labelClass = 'block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)

  const passwordValid = isPasswordValid(password)
  const passwordsMatch = password === confirm
  const canSubmit = !pending && passwordValid && passwordsMatch && confirm.length > 0

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    setPending(true)
    setFormError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setFormError(error.message); setPending(false); return }

    await supabase.auth.signOut()
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#05050A] text-white font-medium">
        <PublicHeader />
        <div className="flex items-center justify-center py-20 px-4">
          <div className="w-full max-w-sm bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
            <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider mb-3">Password Updated</h1>
            <p className="text-sm text-gray-400">Password reset successful, please login.</p>
            <Link href="/login">
              <button className="mt-6 w-full bg-[#00FFFF] text-[#05050A] py-3 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/20 hover:shadow-[#00FFFF]/40 hover:bg-[#00FFFF]/90 transition-all">
                Sign in
              </button>
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
            <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider">Reset Password</h1>
            <p className="mt-1 text-sm text-gray-400">Enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className={labelClass}>New Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className={inputClass}
              />
              <div className="mt-2">
                <PasswordStrength password={password} />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className={inputClass}
              />
              {confirm && !passwordsMatch && (
                <p className="mt-1.5 text-xs text-red-400">Passwords do not match.</p>
              )}
            </div>

            {formError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-[#00FFFF] text-[#05050A] py-3 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/20 hover:shadow-[#00FFFF]/40 hover:bg-[#00FFFF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Saving…' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PasswordStrength } from '@/components/ui/password-strength'
import { isPasswordValid } from '@/lib/validations/password'
import { PublicHeader } from '@/components/landing/public-header'

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 focus:border-[#00FFFF]/50 transition-all text-sm'

const labelClass = 'block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const passwordValid = isPasswordValid(password)
  const passwordsMatch = password === confirm
  const canSubmit = !pending && passwordValid && passwordsMatch && confirm.length > 0

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    setPending(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setPending(false); return }

    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-sm bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider">Set Password</h1>
            <p className="mt-1 text-sm text-gray-400">Create a password to access your account in the future.</p>
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

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-[#00FFFF] text-[#05050A] py-3 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/20 hover:shadow-[#00FFFF]/40 hover:bg-[#00FFFF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Saving…' : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

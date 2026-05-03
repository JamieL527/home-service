'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PasswordStrength } from '@/components/ui/password-strength'
import { isPasswordValid } from '@/lib/validations/password'

const inputClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-8 shadow-sm text-center">
          <h1 className="text-lg font-semibold text-foreground">Password updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Password reset successful, please login.
          </p>
          <Link href="/login">
            <Button className="mt-6 w-full" size="lg">Sign in</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              New password
            </label>
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
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm password
            </label>
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
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          {formError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
            {pending ? 'Saving…' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}

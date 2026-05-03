'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PasswordStrength } from '@/components/ui/password-strength'
import { isPasswordValid } from '@/lib/validations/password'

const inputClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-8 shadow-lg">
        <h1 className="text-xl font-semibold text-foreground">Set your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a password to access your account in the future.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {pending ? 'Saving…' : 'Set password & continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}

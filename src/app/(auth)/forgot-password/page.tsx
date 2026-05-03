'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const inputClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-8 shadow-sm text-center">
          <h1 className="text-lg font-semibold text-foreground">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a password reset link to your email address. Please check your inbox.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Forgot password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
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

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

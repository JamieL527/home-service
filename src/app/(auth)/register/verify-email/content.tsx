'use client'

import { useActionState } from 'react'
import { resendVerificationEmail } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export function VerifyEmailContent({ email }: { email: string }) {
  const [state, action, isPending] = useActionState(resendVerificationEmail, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        <div className="mb-4 text-4xl">📧</div>
        <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We&apos;ve sent a verification link to{' '}
          <span className="font-medium text-foreground">{email}</span>.
          Please click the link in the email to verify your account and continue
          setting up your profile.
        </p>

        {state?.error && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Verification email resent. Please check your inbox.
          </p>
        )}

        <form action={action} className="mt-6">
          <input type="hidden" name="email" value={email} />
          <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
            {isPending ? 'Sending…' : 'Resend email'}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Once verified, you&apos;ll be redirected to complete your business profile.
        </p>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type ErrorType = 'expired' | 'invalid' | 'generic'

export default function AcceptInvitePage() {
  const router = useRouter()
  const [errorType, setErrorType] = useState<ErrorType | null>(null)
  const [genericMessage, setGenericMessage] = useState<string | null>(null)

  useEffect(() => {
    async function process() {
      // Check for error redirected back from Supabase in the hash
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const hashErrorCode = hash.get('error_code')
      const hashErrorDesc = hash.get('error_description') ?? ''

      if (hashErrorCode || hash.get('error')) {
        if (hashErrorCode === 'otp_expired' || hashErrorDesc.toLowerCase().includes('expired')) {
          setErrorType('expired')
        } else {
          setErrorType('invalid')
        }
        return
      }

      // PKCE flow: ?code= in query string
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        window.location.href = `/api/auth/contractor-invite?code=${code}`
        return
      }

      // Implicit flow: #access_token= in hash
      const access_token = hash.get('access_token')
      const refresh_token = hash.get('refresh_token') ?? ''

      if (!access_token) {
        setErrorType('invalid')
        return
      }

      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token })
      if (sessionError) {
        if (sessionError.message.toLowerCase().includes('expired')) {
          setErrorType('expired')
        } else {
          setErrorType('generic')
          setGenericMessage(sessionError.message)
        }
        return
      }

      const res = await fetch('/api/auth/set-role-cookie', { method: 'POST' })
      if (!res.ok) {
        setErrorType('generic')
        setGenericMessage('Failed to initialize your account. Please contact support.')
        return
      }

      router.replace('/set-password')
    }

    process()
  }, [router])

  if (errorType === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-amber-600 text-xl">⏱</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Invitation Expired</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This invitation link has expired. Please contact your administrator to send a new invitation.
          </p>
          <Link
            href="/login"
            className="inline-block w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  if (errorType === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">✕</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Invalid Invitation</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This invitation link is invalid or has already been used. Please contact your administrator.
          </p>
          <Link
            href="/login"
            className="inline-block w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  if (errorType === 'generic') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center">
          <h1 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6">{genericMessage}</p>
          <Link
            href="/login"
            className="inline-block w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Processing your invitation…</p>
    </div>
  )
}

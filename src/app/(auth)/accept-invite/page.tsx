'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AcceptInvitePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function process() {
      // PKCE flow: ?code= — delegate to the server-side handler which can
      // exchange the code and set all cookies in one redirect response.
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        window.location.href = `/api/auth/contractor-invite?code=${code}`
        return
      }

      // Implicit flow: #access_token= — hash fragments are client-only, so
      // we must handle them here with the browser Supabase client.
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const access_token = hash.get('access_token')
      const refresh_token = hash.get('refresh_token') ?? ''

      if (!access_token) {
        setError('Invalid invitation link. Please request a new invitation.')
        return
      }

      const supabase = createClient()

      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })
      if (sessionError) {
        setError(sessionError.message)
        return
      }

      // Ask the server to set the httpOnly user-role cookie now that the
      // Supabase session cookies are in place.
      const res = await fetch('/api/auth/set-role-cookie', { method: 'POST' })
      if (!res.ok) {
        setError('Failed to initialize your account. Please contact support.')
        return
      }

      router.replace('/set-password')
    }

    process()
  }, [router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Processing your invitation…</p>
    </div>
  )
}

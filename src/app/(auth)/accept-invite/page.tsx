'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PublicHeader } from '@/components/landing/public-header'

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

  const card = (title: string, message: string, icon: string) => (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-sm bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
          <div className="text-4xl mb-4">{icon}</div>
          <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider mb-3">{title}</h1>
          <p className="text-sm text-gray-400 mb-6">{message}</p>
          <Link href="/login" className="block w-full bg-[#00FFFF] text-[#05050A] py-3 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/20 hover:shadow-[#00FFFF]/40 hover:bg-[#00FFFF]/90 transition-all">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )

  if (errorType === 'expired') return card('Invitation Expired', 'This invitation link has expired. Please contact your administrator to send a new invitation.', '⏱')
  if (errorType === 'invalid') return card('Invalid Invitation', 'This invitation link is invalid or has already been used. Please contact your administrator.', '✕')
  if (errorType === 'generic') return card('Something Went Wrong', genericMessage ?? 'An unexpected error occurred.', '⚠️')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05050A]">
      <p className="text-sm text-gray-500">Processing your invitation…</p>
    </div>
  )
}

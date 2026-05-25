import { logout } from '@/app/actions/auth'
import { PublicHeader } from '@/components/landing/public-header'

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />
      <div className="flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-sm bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
          <div className="mb-4 text-4xl">🕐</div>
          <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider mb-3">Application Under Review</h1>
          <p className="text-sm text-gray-400">
            Your application is under review. We&apos;ll notify you by email once approved.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            This process usually takes 1–2 business days.
          </p>
          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="w-full border border-white/20 text-gray-300 py-3 rounded-lg font-semibold hover:bg-white/5 transition-all"
            >
              Sign out
            </button>
          </form>
          <p className="mt-4 text-xs text-gray-500">
            Need help?{' '}
            <a href="mailto:build@constructionmarket.ca" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

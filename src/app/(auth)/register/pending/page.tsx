import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm mx-4 rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        <div className="mb-4 text-4xl">🕐</div>
        <h1 className="text-xl font-semibold text-foreground">Application under review</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your application is under review. We&apos;ll notify you by email once approved.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          This process usually takes 1–2 business days.
        </p>
        <form action={logout} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Need help?{' '}
          <Link
            href="mailto:support@example.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  )
}

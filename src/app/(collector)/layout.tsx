import { CollectorSidebarNav } from '@/components/collector/sidebar-nav'
import { CollectorBottomNav } from '@/components/collector/bottom-nav'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default function CollectorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop only */}
      <aside className="hidden sm:flex sm:w-56 sm:shrink-0 sm:flex-col border-r border-white/10 bg-[#1a2e4a]">
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <span className="text-lg font-bold text-white">Data Collector</span>
        </div>
        <CollectorSidebarNav />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
          {/* Mobile: show app name; desktop: show user/company info */}
          <span className="sm:hidden text-sm font-bold text-[#1a2e4a]">Data Collector</span>
          <span className="hidden sm:block text-sm text-gray-500">Blue Jays On Air</span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>

        {/* Extra bottom padding on mobile for the fixed bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <CollectorBottomNav />
    </div>
  )
}

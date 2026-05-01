import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { MarketingSidebarNav } from '@/components/marketing/sidebar-nav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-white/10 bg-[#1a2e4a]">
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <span className="text-2xl font-bold text-white">Marketing</span>
        </div>
        <MarketingSidebarNav />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <span className="text-2xl font-medium text-gray-500">Blue Jays On Air</span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

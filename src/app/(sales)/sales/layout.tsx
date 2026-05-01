import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { SalesSidebarNav } from '@/components/sales/sidebar-nav'
import { SalesBottomNav } from '@/components/sales/bottom-nav'

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden sm:flex sm:w-56 sm:shrink-0 sm:flex-col border-r border-white/10 bg-[#1a2e4a]">
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <span className="text-2xl font-bold text-white">Sales</span>
        </div>
        <SalesSidebarNav />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <span className="sm:hidden text-sm font-bold text-[#1a2e4a]">Sales</span>
          <span className="hidden sm:block text-xl font-medium text-gray-500">Blue Jays On Air</span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">{children}</main>
      </div>

      <SalesBottomNav />
    </div>
  )
}

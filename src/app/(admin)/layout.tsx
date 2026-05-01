import { SidebarNav } from '@/components/admin/sidebar-nav'
import { AdminMobileNav } from '@/components/admin/mobile-nav'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden sm:flex sm:w-56 sm:shrink-0 sm:flex-col bg-[#1a2e4a]">
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <span className="text-lg font-bold text-white">Admin Panel</span>
        </div>
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
          <div className="sm:hidden">
            <AdminMobileNav />
          </div>
          <span className="hidden sm:block text-xl font-medium text-foreground">Blue Jays On Air</span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

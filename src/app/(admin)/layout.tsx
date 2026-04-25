import { SidebarNav } from '@/components/admin/sidebar-nav'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-card">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-2xl font-semibold text-foreground">Admin Panel</span>
        </div>
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <span className="text-2xl font-medium text-foreground">Home Service Platform</span>
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

import { ContractorSidebarNav } from '@/components/contractor/sidebar-nav'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { requireContractorUser } from '@/lib/contractor'

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const { company, email } = await requireContractorUser()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-card">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="truncate text-sm font-semibold text-foreground">{company.name}</span>
        </div>
        <ContractorSidebarNav />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <span className="text-sm text-muted-foreground">{email}</span>
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

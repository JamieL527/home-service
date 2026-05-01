import { ContractorSidebarNav } from '@/components/contractor/sidebar-nav'
import { ContractorBottomNav } from '@/components/contractor/bottom-nav'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { requireContractorUser } from '@/lib/contractor'

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const { company, email } = await requireContractorUser()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden sm:flex sm:w-56 sm:shrink-0 sm:flex-col border-r border-white/10 bg-[#1a2e4a]">
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <span className="truncate text-sm font-bold text-white">{company.name}</span>
        </div>
        <ContractorSidebarNav />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
          <span className="sm:hidden text-sm font-bold text-[#1a2e4a] truncate max-w-[60%]">{company.name}</span>
          <span className="hidden sm:block text-sm text-gray-500">{email}</span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">{children}</main>
      </div>
      <ContractorBottomNav />
    </div>
  )
}

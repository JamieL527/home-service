import { requireCollectorUser } from '@/lib/collector'
import { NewLeadForm } from './form'

export default async function NewLeadPage() {
  const { user } = await requireCollectorUser()

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">New Lead</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in what you observed on site.</p>
      </div>
      <NewLeadForm zoneId={user.zoneId} zoneName={user.zone?.name ?? null} />
    </div>
  )
}

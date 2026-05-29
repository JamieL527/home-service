import { Loader2 } from 'lucide-react'

export default function PermitsLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <Loader2 size={28} className="animate-spin text-gray-400" />
    </div>
  )
}

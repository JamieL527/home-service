'use client'

import { useTransition } from 'react'
import { deleteContractor } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

export function DeleteContractorButton({ companyId }: { companyId: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Delete this contractor company and all its members? This action cannot be undone.')) return
    startTransition(() => deleteContractor(companyId))
  }

  return (
    <Button onClick={handleClick} variant="destructive" size="sm" disabled={pending}>
      {pending ? 'Deleting…' : 'Delete'}
    </Button>
  )
}

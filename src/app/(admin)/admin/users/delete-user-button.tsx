'use client'

import { useTransition } from 'react'
import { deleteUser } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

export function DeleteUserButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Delete this user? This action cannot be undone.')) return
    startTransition(() => deleteUser(userId))
  }

  return (
    <Button onClick={handleClick} variant="destructive" size="sm" disabled={pending}>
      {pending ? 'Deleting…' : 'Delete'}
    </Button>
  )
}

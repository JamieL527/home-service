'use client'

import { useActionState, useEffect, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { inviteInternalUser } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const selectClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const ROLES = [
    { value: 'ADMIN', label: 'Admin' },
  { value: 'SALES', label: 'Sales' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'DATA_COLLECTOR', label: 'Data Collector' },
]

export function InviteUserButton() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(inviteInternalUser, null)

  useEffect(() => {
    if (state && 'success' in state) {
      setOpen(false)
    }
  }, [state])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={<Button size="sm">Invite User</Button>} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl outline-none">
          <Dialog.Title className="text-lg font-semibold text-foreground">
            Invite Internal User
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            An invitation email will be sent. The user sets their own password when they accept.
          </Dialog.Description>

          <form action={action} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                name="email"
                type="email"
                required
                autoFocus
                placeholder="user@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Role</label>
              <select name="role" required defaultValue="" className={selectClass}>
                <option value="" disabled>
                  Select a role…
                </option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {state && 'error' in state && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close render={<Button variant="outline" type="button">Cancel</Button>} />
              <Button type="submit" disabled={pending}>
                {pending ? 'Sending…' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

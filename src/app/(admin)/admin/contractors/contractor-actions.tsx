'use client'

import { useTransition, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { approveContractor, rejectContractor, requestMoreInfo } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

const textareaClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none'

function ReasonDialog({
  title,
  description,
  submitLabel,
  submitVariant,
  onConfirm,
}: {
  title: string
  description: string
  submitLabel: string
  submitVariant?: 'destructive' | 'default'
  onConfirm: (reason: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      await onConfirm(reason)
      setOpen(false)
      setReason('')
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button size="sm" variant={submitVariant === 'destructive' ? 'destructive' : 'outline'}>
            {title}
          </Button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl outline-none">
          <Dialog.Title className="text-lg font-semibold text-foreground">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {description}
          </Dialog.Description>
          <div className="mt-4">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add a note (optional)…"
              rows={3}
              className={textareaClass}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close render={<Button variant="outline" type="button">Cancel</Button>} />
            <Button
              variant={submitVariant}
              onClick={handleSubmit}
              disabled={pending}
            >
              {pending ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ContractorActions({ companyId }: { companyId: string }) {
  const [approvePending, startApprove] = useTransition()

  return (
    <div className="flex gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          startApprove(() => approveContractor(companyId))
        }}
      >
        <Button type="submit" size="sm" disabled={approvePending}>
          {approvePending ? 'Approving…' : 'Approve'}
        </Button>
      </form>

      <ReasonDialog
        title="Request More Info"
        description="Describe what additional information or corrections are needed."
        submitLabel="Send Request"
        onConfirm={(note) => requestMoreInfo(companyId, note)}
      />

      <ReasonDialog
        title="Reject"
        description="Provide a reason for rejection (optional). This will be stored as an admin note."
        submitLabel="Confirm Reject"
        submitVariant="destructive"
        onConfirm={(reason) => rejectContractor(companyId, reason)}
      />
    </div>
  )
}

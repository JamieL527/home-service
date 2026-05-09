'use client'

import { useState, useTransition } from 'react'
import { updateContractorProfile } from '@/app/actions/contractor-profile'

type Company = {
  name: string
  businessNumber: string | null
  wsibNumber: string | null
  insuranceNumber: string | null
  status: string
  tradeType: string | null
  contactName: string | null
  contactTitle: string | null
  contactEmail: string | null
  contactPhone: string | null
  website: string | null
  address: string | null
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  UNVERIFIED_PROFILE: 'bg-gray-100 text-gray-600',
  ACTION_REQUIRED: 'bg-orange-100 text-orange-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING_APPROVAL: 'Pending Approval',
  UNVERIFIED_PROFILE: 'Profile Incomplete',
  ACTION_REQUIRED: 'Action Required',
  REJECTED: 'Rejected',
}

function ReadonlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function EditField({
  label,
  name,
  value,
  type = 'text',
  placeholder,
}: {
  label: string
  name: string
  value: string
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input
        name={name}
        defaultValue={value}
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-input rounded-md outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 bg-background"
      />
    </div>
  )
}

export default function ProfileForm({ company }: { company: Company }) {
  const [editing, setEditing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    setEditing(false)
    setError(null)
    setSuccess(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      contactName: fd.get('contactName') as string,
      contactTitle: fd.get('contactTitle') as string,
      contactEmail: fd.get('contactEmail') as string,
      contactPhone: fd.get('contactPhone') as string,
      website: fd.get('website') as string,
      address: fd.get('address') as string,
    }
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateContractorProfile(data)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setEditing(false)
      }
    })
  }

  const statusStyle = STATUS_STYLES[company.status] ?? 'bg-gray-100 text-gray-600'
  const statusLabel = STATUS_LABELS[company.status] ?? company.status

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setSuccess(false) }}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Profile updated successfully
        </div>
      )}

      {/* Company Information (read-only) */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Company Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadonlyField label="Business Registered Name" value={company.name} />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Account Status</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>
          <ReadonlyField label="Business Number" value={company.businessNumber} />
          <ReadonlyField label="Trade / Service Type" value={company.tradeType} />
          <ReadonlyField label="WSIB Number" value={company.wsibNumber} />
          <ReadonlyField label="Insurance Number" value={company.insuranceNumber} />
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          To update company registration details, please contact support.
        </p>
      </div>

      {/* Contact Information */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Contact Information</h2>

          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EditField label="Contact Person Name" name="contactName" value={company.contactName ?? ''} placeholder="Full name" />
              <EditField label="Contact Title" name="contactTitle" value={company.contactTitle ?? ''} placeholder="e.g. Owner, Manager" />
              <EditField label="Contact Email" name="contactEmail" value={company.contactEmail ?? ''} type="email" placeholder="email@example.com" />
              <EditField label="Contact Phone" name="contactPhone" value={company.contactPhone ?? ''} type="tel" placeholder="+1 (416) 000-0000" />
              <EditField label="Website" name="website" value={company.website ?? ''} placeholder="e.g. example.com or https://example.com" />
              <EditField label="Office Address" name="address" value={company.address ?? ''} placeholder="123 Main St, Toronto, ON" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadonlyField label="Contact Person Name" value={company.contactName} />
              <ReadonlyField label="Contact Title" value={company.contactTitle} />
              <ReadonlyField label="Contact Email" value={company.contactEmail} />
              <ReadonlyField label="Contact Phone" value={company.contactPhone} />
              <ReadonlyField label="Website" value={company.website} />
              <ReadonlyField label="Office Address" value={company.address} />
            </div>
          )}
        </div>

        {editing && (
          <div className="mt-4 flex items-center gap-3">
            {error && <p className="text-sm text-red-600 flex-1">{error}</p>}
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="px-4 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

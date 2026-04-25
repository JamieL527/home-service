'use client'

import { useActionState } from 'react'
import { saveBusinessProfile } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

const inputClass =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

const labelClass = 'text-sm font-medium text-foreground'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">
      {children}
    </h2>
  )
}

function Field({
  id,
  label,
  name,
  type = 'text',
  required,
  placeholder,
  defaultValue,
}: {
  id: string
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
        {!required && <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={inputClass}
      />
    </div>
  )
}

export type BusinessProfileValues = {
  name: string
  businessNumber: string
  address: string
  website: string
  contactName: string
  contactTitle: string
  contactEmail: string
  contactPhone: string
  wsibNumber: string
  insuranceNumber: string
}

export function BusinessProfileForm({
  initialValues,
  verified,
}: {
  initialValues: BusinessProfileValues | null
  verified?: boolean
}) {
  const [state, action, isPending] = useActionState(saveBusinessProfile, null)

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-sm">
        {verified && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Email verified! Please complete your business profile.
          </div>
        )}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Complete your business profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {initialValues?.name
              ? 'Update the information below and resubmit for review.'
              : 'This information will be reviewed by our team before your account is approved.'}
          </p>
        </div>

        <form action={action} className="space-y-6">
          <div>
            <SectionTitle>Business Information</SectionTitle>
            <div className="space-y-4">
              <Field
                id="name"
                label="Business Registered Name"
                name="name"
                required
                placeholder="Acme Construction Inc."
                defaultValue={initialValues?.name}
              />
              <Field
                id="businessNumber"
                label="Business Number / B.N."
                name="businessNumber"
                required
                placeholder="123456789"
                defaultValue={initialValues?.businessNumber}
              />
              <Field
                id="address"
                label="Address"
                name="address"
                required
                placeholder="123 Main St, Toronto, ON M1A 1A1"
                defaultValue={initialValues?.address}
              />
              <Field
                id="website"
                label="Website"
                name="website"
                type="url"
                placeholder="https://yourcompany.com"
                defaultValue={initialValues?.website}
              />
            </div>
          </div>

          <div>
            <SectionTitle>Person in Charge</SectionTitle>
            <div className="space-y-4">
              <Field
                id="contactName"
                label="Name"
                name="contactName"
                required
                placeholder="Jane Smith"
                defaultValue={initialValues?.contactName}
              />
              <Field
                id="contactTitle"
                label="Title"
                name="contactTitle"
                required
                placeholder="Owner / Project Manager"
                defaultValue={initialValues?.contactTitle}
              />
              <Field
                id="contactEmail"
                label="Email"
                name="contactEmail"
                type="email"
                required
                placeholder="jane@yourcompany.com"
                defaultValue={initialValues?.contactEmail}
              />
              <Field
                id="contactPhone"
                label="Phone"
                name="contactPhone"
                type="tel"
                required
                placeholder="+1 (416) 555-0100"
                defaultValue={initialValues?.contactPhone}
              />
            </div>
          </div>

          <div>
            <SectionTitle>Insurance & Compliance</SectionTitle>
            <div className="space-y-4">
              <Field
                id="wsibNumber"
                label="WSIB Number"
                name="wsibNumber"
                required
                placeholder="1234567"
                defaultValue={initialValues?.wsibNumber}
              />
              <Field
                id="insuranceNumber"
                label="Insurance Number"
                name="insuranceNumber"
                required
                placeholder="INS-987654321"
                defaultValue={initialValues?.insuranceNumber}
              />
            </div>
          </div>

          {state && 'error' in state && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="space-y-4 border-t border-border pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="termsAccepted"
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                required
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{' '}
                <span className="text-primary underline-offset-4 hover:underline cursor-pointer">
                  Terms & Conditions
                </span>{' '}
                and confirm that all information provided is accurate.
              </span>
            </label>

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? 'Submitting…' : 'Submit application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

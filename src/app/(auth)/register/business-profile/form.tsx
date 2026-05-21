'use client'

import { useActionState, useRef, useState } from 'react'
import { saveBusinessProfile } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

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
  tradeType: string
  contactName: string
  contactTitle: string
  contactEmail: string
  contactPhone: string
  wsibNumber: string
  insuranceNumber: string
  logoUrl?: string
}

export function BusinessProfileForm({
  initialValues,
  verified,
}: {
  initialValues: BusinessProfileValues | null
  verified?: boolean
}) {
  const [state, action, isPending] = useActionState(saveBusinessProfile, null)
  const [logoUrl, setLogoUrl] = useState(initialValues?.logoUrl ?? '')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `logos/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('contractor-logos').upload(path, file, { upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('contractor-logos').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
    } catch {
      alert('Logo upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
    }
  }

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
          <input type="hidden" name="logoUrl" value={logoUrl} />

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
                placeholder="e.g. example.com or https://example.com"
                defaultValue={initialValues?.website}
              />
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Company Logo
                  <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo preview" className="h-12 w-12 rounded-lg object-contain border border-border bg-muted" />
                  )}
                  <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoFile} />
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    disabled={logoUploading}
                    className="text-sm font-medium text-primary border border-border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {logoUploading ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {logoUrl && (
                    <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tradeType" className={labelClass}>
                  Trade / Service Type
                  <span className="ml-1 text-xs text-muted-foreground">(required)</span>
                </label>
                <select
                  id="tradeType"
                  name="tradeType"
                  required
                  defaultValue={initialValues?.tradeType ?? ''}
                  className={inputClass}
                >
                  <option value="" disabled>Select your primary trade...</option>
                  <option value="General Contractor">General Contractor</option>
                  <option value="Framing">Framing</option>
                  <option value="Foundation">Foundation</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="HVAC">HVAC / Mechanical</option>
                  <option value="Drywall">Drywall</option>
                  <option value="Roofing">Roofing</option>
                  <option value="Flooring">Flooring</option>
                  <option value="Painting">Painting</option>
                  <option value="Landscaping">Landscaping</option>
                  <option value="Renovation">Renovation / MLS</option>
                  <option value="Other">Other</option>
                </select>
              </div>
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

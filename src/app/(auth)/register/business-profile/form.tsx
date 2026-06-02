'use client'

import { useActionState, useRef, useState } from 'react'
import { saveBusinessProfile } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, Hash, MapPin, Globe, ImageIcon, Wrench,
  User, Briefcase, Mail, Phone, Shield, ShieldCheck,
} from 'lucide-react'

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 focus:border-[#00FFFF]/50 transition-all text-sm'

const labelClass = 'block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
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
  icon: Icon,
}: {
  id: string
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
  icon?: React.ElementType
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
          {!required && <span className="ml-1 text-xs text-gray-500 normal-case font-normal">(optional)</span>}
        </span>
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
  registrationType?: string
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
    <div className="min-h-screen bg-[#05050A] text-white font-medium py-10 px-4">
      <div className="mx-auto w-full max-w-lg bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        {verified && (
          <div className="mb-6 rounded-lg border border-[#00FFFF]/30 bg-[#00FFFF]/10 px-4 py-3 text-sm text-[#00FFFF]">
            Email verified! Please complete your business profile.
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-[family-name:var(--font-teko)] font-bold uppercase tracking-wider">Business Profile</h1>
          <p className="mt-1 text-sm text-gray-400">
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
                icon={Building2}
              />
              <Field
                id="businessNumber"
                label="Business Number / B.N."
                name="businessNumber"
                required
                placeholder="123456789"
                defaultValue={initialValues?.businessNumber}
                icon={Hash}
              />
              <Field
                id="address"
                label="Address"
                name="address"
                required
                placeholder="123 Main St, Toronto, ON M1A 1A1"
                defaultValue={initialValues?.address}
                icon={MapPin}
              />
              <Field
                id="website"
                label="Website"
                name="website"
                placeholder="e.g. example.com or https://example.com"
                defaultValue={initialValues?.website}
                icon={Globe}
              />
              <div className="space-y-1.5">
                <label className={labelClass}>
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Company Logo
                    <span className="ml-1 text-xs text-gray-500 normal-case font-normal">(optional)</span>
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo preview" className="h-12 w-12 rounded-lg object-contain border border-white/20 bg-white/5" />
                  )}
                  <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoFile} />
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    disabled={logoUploading}
                    className="text-sm font-semibold text-[#00FFFF] border border-[#00FFFF]/30 rounded-lg px-3 py-1.5 hover:bg-[#00FFFF]/10 transition-colors disabled:opacity-50"
                  >
                    {logoUploading ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {logoUrl && (
                    <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Remove</button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tradeType" className={labelClass}>
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    Trade / Service Type
                  </span>
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
                icon={User}
              />
              <Field
                id="contactTitle"
                label="Title"
                name="contactTitle"
                required
                placeholder="Owner / Project Manager"
                defaultValue={initialValues?.contactTitle}
                icon={Briefcase}
              />
              <Field
                id="contactEmail"
                label="Email"
                name="contactEmail"
                type="email"
                required
                placeholder="jane@yourcompany.com"
                defaultValue={initialValues?.contactEmail}
                icon={Mail}
              />
              <Field
                id="contactPhone"
                label="Phone"
                name="contactPhone"
                type="tel"
                required
                placeholder="+1 (416) 555-0100"
                defaultValue={initialValues?.contactPhone}
                icon={Phone}
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
                icon={Shield}
              />
              <Field
                id="insuranceNumber"
                label="Insurance Number"
                name="insuranceNumber"
                required
                placeholder="INS-987654321"
                defaultValue={initialValues?.insuranceNumber}
                icon={ShieldCheck}
              />
            </div>
          </div>

          {state && 'error' in state && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          <div className="space-y-4 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Legal Agreements</p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="termsAccepted"
                className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#00FFFF]"
                required
              />
              <span className="text-sm text-gray-400">
                I have read and agree to the{' '}
                <a href="/terms#terms" target="_blank" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
                  Terms of Use
                </a>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="privacyAccepted"
                className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#00FFFF]"
                required
              />
              <span className="text-sm text-gray-400">
                I have read and agree to the{' '}
                <a href="/terms#privacy" target="_blank" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
                  Privacy Policy
                </a>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="serviceAgreementAccepted"
                className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#00FFFF]"
                required
              />
              <span className="text-sm text-gray-400">
                I have read and agree to the{' '}
                <a href="/terms#service-agreement" target="_blank" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
                  Service Agreement
                </a>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="scheduleAccepted"
                className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#00FFFF]"
                required
              />
              <span className="text-sm text-gray-400">
                I have read and agree to the{' '}
                {initialValues?.registrationType === 'referral' ? (
                  <a href="/legal/schedule-a" target="_blank" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
                    Schedule A — Referral Network
                  </a>
                ) : (
                  <a href="/legal/schedule-b" target="_blank" className="text-[#00FFFF] hover:text-[#00FFFF]/80 transition-colors">
                    Schedule B — Direct Outreach
                  </a>
                )}
              </span>
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#00FFFF] text-[#05050A] py-3 rounded-lg font-semibold shadow-lg shadow-[#00FFFF]/20 hover:shadow-[#00FFFF]/40 hover:bg-[#00FFFF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

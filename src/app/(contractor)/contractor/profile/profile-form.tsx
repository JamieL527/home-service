'use client'

import { useState, useTransition, useRef } from 'react'
import { updateContractorProfile } from '@/app/actions/contractor-profile'
import { createClient } from '@/lib/supabase/client'

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
  logoUrl: string | null
  registrationType: string
  termsAcceptedAt: Date | null
  accountEmail: string
}

function standardizeTitle(title: string | null): string | null {
  if (!title) return title
  return title.replace(/\b\w/g, c => c.toUpperCase())
}

function formatPhone(phone: string | null): string | null {
  if (!phone) return phone
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

const psec: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e7e8ef',
  borderRadius: 14,
  padding: '22px 24px',
  marginBottom: 16,
}

const psecH3: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: '.04em',
  textTransform: 'uppercase',
  color: '#64748b',
}

function PRow({
  label,
  value,
  verified,
  fixed: fixedNote,
  children,
}: {
  label: string
  value?: string | null
  verified?: boolean
  fixed?: string
  children?: React.ReactNode
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 14, padding: '12px 0', borderTop: '1px solid #e7e8ef', fontSize: 14 }}>
      <div style={{ color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 600, color: '#0f172a' }}>
        {children ?? (
          <>
            {value || '—'}
            {verified && (
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 9px', borderRadius: 999, marginLeft: 8, whiteSpace: 'nowrap' }}>
                ✓ Verified
              </span>
            )}
            {fixedNote && (
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#d97706', marginLeft: 8 }}>
                {fixedNote}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ProfileForm({ company }: { company: Company }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? '')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  const initials = company.name
    ? company.name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
    : '?'

  const serviceTier = company.registrationType === 'referral'
    ? 'Referral Network · free (10% on closed deals)'
    : 'Direct Outreach & Q.C.'

  const termsDate = company.termsAcceptedAt
    ? new Date(company.termsAcceptedAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const agreementName = company.registrationType === 'referral'
    ? 'Referral Service Agreement v1.0'
    : 'Direct Outreach Agreement v1.0'

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `logos/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('contractor-logos').upload(path, file, { upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('contractor-logos').getPublicUrl(path)
      const newUrl = data.publicUrl
      setLogoUrl(newUrl)
      startTransition(async () => {
        await updateContractorProfile({
          contactName: company.contactName ?? '',
          contactTitle: company.contactTitle ?? '',
          contactEmail: company.contactEmail ?? '',
          contactPhone: company.contactPhone ?? '',
          website: company.website ?? '',
          address: company.address ?? '',
          logoUrl: newUrl,
        })
      })
    } catch {
      setError('Logo upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await updateContractorProfile({
        contactName: fd.get('contactName') as string,
        contactTitle: fd.get('contactTitle') as string,
        contactEmail: fd.get('contactEmail') as string,
        contactPhone: fd.get('contactPhone') as string,
        website: fd.get('website') as string,
        address: fd.get('address') as string,
        logoUrl,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setEditing(false)
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #e7e8ef',
    borderRadius: 9,
    padding: '9px 12px',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    color: '#0f172a',
    background: '#fff',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', margin: '0 0 14px' }}>
        Profile
      </h1>

      {/* pnote */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#92400e', marginBottom: 18 }}>
        This is your verified account profile — the record Construction Market holds after approval. A few fields were standardized from your application (phone formatting, contact title). To change anything, message the team.
      </div>

      {/* Brand / Logo */}
      <div style={psec}>
        <h3 style={psecH3}>Brand / Logo</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 86, height: 86, borderRadius: 14, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, overflow: 'hidden', flexShrink: 0 }}>
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : initials}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Company logo</div>
            <div style={{ fontSize: 13, color: '#64748b', margin: '4px 0 10px' }}>Upload your logo — it appears on every quote you issue.</div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              disabled={logoUploading}
              style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 13, padding: '9px 14px', cursor: logoUploading ? 'not-allowed' : 'pointer', opacity: logoUploading ? 0.55 : 1 }}
            >
              ⬆ {logoUploading ? 'Uploading…' : 'Upload logo'}
            </button>
          </div>
        </div>
      </div>

      {/* Company */}
      <div style={psec}>
        <h3 style={psecH3}>Company</h3>
        <PRow label="Legal name" value={company.name} />
        <PRow label="Trade / service" value={company.tradeType} verified />
        <PRow label="Business address" value={company.address} />
        <PRow label="Website" value={company.website || '—'} />
        <PRow label="Account email" value={company.accountEmail} />
      </div>

      {/* Person in charge */}
      <div style={psec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ ...psecH3, margin: 0 }}>Person in charge</h3>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setSuccess(false) }}
              style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Name</label>
                  <input name="contactName" defaultValue={company.contactName ?? ''} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Title</label>
                  <input name="contactTitle" defaultValue={company.contactTitle ?? ''} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
                  <input name="contactEmail" type="email" defaultValue={company.contactEmail ?? ''} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Phone</label>
                  <input name="contactPhone" defaultValue={company.contactPhone ?? ''} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Website</label>
                  <input name="website" defaultValue={company.website ?? ''} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Business address</label>
                  <input name="address" defaultValue={company.address ?? ''} style={inputStyle} />
                </div>
              </div>
              {error && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setError(null) }}
                  disabled={isPending}
                  style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 13, padding: '10px 18px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 11, fontWeight: 700, fontSize: 13, padding: '10px 18px', cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}
                >
                  {isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            {success && (
              <div style={{ fontSize: 13, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 4 }}>
                Profile updated successfully
              </div>
            )}
            <PRow label="Name" value={company.contactName} />
            <PRow label="Title" value={standardizeTitle(company.contactTitle)} fixed="standardized from application" />
            <PRow label="Email" value={company.contactEmail} />
            <PRow label="Phone" value={formatPhone(company.contactPhone)} fixed="formatted" />
          </>
        )}
      </div>

      {/* Insurance & compliance */}
      <div style={psec}>
        <h3 style={psecH3}>Insurance &amp; compliance</h3>
        <PRow label="WSIB number" value={company.wsibNumber} verified />
        <PRow label="Insurance number" value={company.insuranceNumber} verified />
      </div>

      {/* Account */}
      <div style={psec}>
        <h3 style={psecH3}>Account</h3>
        <PRow label="Service tier" value={serviceTier} />
        <PRow label="Status" value="Active" />
        {termsDate && (
          <PRow label="Agreement accepted" value={`${termsDate} · ${agreementName}`} />
        )}
      </div>
    </div>
  )
}

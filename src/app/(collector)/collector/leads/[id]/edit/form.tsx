'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateLeadDetails, addLeadPhoto, removeLeadPhoto, type ContactInput, type SupplierInput } from '@/app/actions/collector-leads'
import { createClient } from '@/lib/supabase/client'
import { PhotoGrid, type PhotoItem } from '@/components/ui/photo-grid'
import { Building, Globe, MapPin, Star, Users, Phone, Mail, Plus, X, Hammer, MessageCircle, Save, Camera, Loader2 } from 'lucide-react'

type PhotoCategory = 'site' | 'demand' | 'supply' | 'other'
type PhotosData = Record<PhotoCategory, string[]>

const PHOTO_CATS: { key: PhotoCategory; label: string }[] = [
  { key: 'site', label: 'Site' },
  { key: 'demand', label: 'Demand' },
  { key: 'supply', label: 'Supply' },
  { key: 'other', label: 'Other' },
]

const PHASES = [
  { value: 'P0', label: 'Phase 0: Survey' },
  { value: 'P1', label: 'Phase 1: Foundation' },
  { value: 'P2', label: 'Phase 2: Framing' },
  { value: 'P3', label: 'Phase 3: MEC/Drywall' },
  { value: 'P4', label: 'Phase 4: Finishing' },
  { value: 'P5', label: 'Phase 5: Landscaping' },
  { value: 'MLS', label: 'MLS: Renovation' },
]

type Props = {
  leadId: string
  initial: {
    businessName: string
    website: string
    officeLocation: string
    rating: string
    zoneName: string
    initialComment: string
    contacts: ContactInput[]
    suppliers: SupplierInput[]
    photos: PhotosData
  }
}

export function EditLeadForm({ leadId, initial }: Props) {
  const [businessName, setBusinessName] = useState(initial.businessName)
  const [website, setWebsite] = useState(initial.website)
  const [officeLocation, setOfficeLocation] = useState(initial.officeLocation)
  const [rating, setRating] = useState(initial.rating)
  const [zoneName, setZoneName] = useState(initial.zoneName)
  const [initialComment, setInitialComment] = useState(initial.initialComment)
  const [contacts, setContacts] = useState<ContactInput[]>(
    initial.contacts.length > 0
      ? initial.contacts
      : [{ name: '', email: '', phone: '', role: '' }],
  )
  const [suppliers, setSuppliers] = useState<SupplierInput[]>(
    initial.suppliers.length > 0
      ? initial.suppliers
      : [{ trade: '', company: '', contact: '', phone: '', email: '', website: '', officeLocation: '', interaction: '' }],
  )
  const [photos, setPhotos] = useState<PhotosData>(initial.photos)
  const [uploadingCat, setUploadingCat] = useState<PhotoCategory | null>(null)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const photoInputRefs: Record<PhotoCategory, React.RefObject<HTMLInputElement | null>> = {
    site: useRef<HTMLInputElement>(null),
    demand: useRef<HTMLInputElement>(null),
    supply: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  }
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, cat: PhotoCategory) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setUploadingCat(cat)
    const supabase = createClient()
    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `leads/${leadId}/${cat}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('lead-photos').upload(path, file, { upsert: false })
      if (error) continue
      const { data } = supabase.storage.from('lead-photos').getPublicUrl(path)
      await addLeadPhoto(leadId, cat, data.publicUrl)
      setPhotos((p) => ({ ...p, [cat]: [...p[cat], data.publicUrl] }))
    }
    setUploadingCat(null)
  }

  async function handlePhotoDelete(cat: PhotoCategory, url: string) {
    setDeletingUrl(url)
    await removeLeadPhoto(leadId, cat, url)
    setPhotos((p) => ({ ...p, [cat]: p[cat].filter((u) => u !== url) }))
    setDeletingUrl(null)
  }

  function addContact() {
    setContacts((p) => [...p, { name: '', email: '', phone: '', role: '' }])
  }

  function removeContact(i: number) {
    setContacts((p) => p.filter((_, idx) => idx !== i))
  }

  function updateContact(i: number, field: keyof ContactInput, value: string) {
    setContacts((p) => p.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)))
  }

  function addSupplier() {
    setSuppliers((p) => [...p, { trade: '', company: '', contact: '', phone: '', email: '', website: '', officeLocation: '', interaction: '' }])
  }

  function removeSupplier(i: number) {
    setSuppliers((p) => p.filter((_, idx) => idx !== i))
  }

  function updateSupplier(i: number, field: keyof SupplierInput, value: string) {
    setSuppliers((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  function handleSave() {
    startTransition(async () => {
      await updateLeadDetails(leadId, {
        businessName,
        website,
        officeLocation,
        rating,
        zoneName,
        initialComment,
        contacts,
        suppliers,
      })
    })
  }

  return (
    <div className="space-y-4 pb-24">

      {/* Demand Side */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-3">
          <Building size={14} className="text-blue-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">3. Demand Side</span>
        </div>

        <div className="space-y-2">
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            type="text"
            placeholder="Company / Builder Name"
            className="w-full p-3 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
              <Globe size={13} className="text-gray-400 shrink-0" />
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                type="url"
                placeholder="Website"
                className="w-full p-2 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
              <MapPin size={13} className="text-gray-400 shrink-0" />
              <input
                value={officeLocation}
                onChange={(e) => setOfficeLocation(e.target.value)}
                type="text"
                placeholder="HQ Address"
                className="w-full p-2 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2.5 focus-within:ring-2 focus-within:ring-blue-400">
            <Star size={13} className="text-gray-400 shrink-0" />
            <input
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              type="text"
              placeholder="Rating (e.g. 4.5)"
              className="w-full p-2 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {/* Contacts */}
        <div id="contacts" className="mt-5 space-y-3 scroll-mt-20">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={13} />
            Personnel In Charge
          </span>
          {contacts.map((c, i) => (
            <div key={i} className="bg-white p-3 rounded-lg border border-blue-200 relative">
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  value={c.name}
                  onChange={(e) => updateContact(i, 'name', e.target.value)}
                  type="text"
                  placeholder="Name"
                  className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <input
                  value={c.role}
                  onChange={(e) => updateContact(i, 'role', e.target.value)}
                  type="text"
                  placeholder="Role (e.g. Site Super)"
                  className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center border border-gray-200 rounded-lg px-2 focus-within:ring-1 focus-within:ring-blue-400">
                  <Phone size={11} className="text-gray-400 shrink-0" />
                  <input
                    value={c.phone}
                    onChange={(e) => updateContact(i, 'phone', e.target.value)}
                    type="tel"
                    placeholder="Phone"
                    className="w-full p-2 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg px-2 focus-within:ring-1 focus-within:ring-blue-400">
                  <Mail size={11} className="text-gray-400 shrink-0" />
                  <input
                    value={c.email}
                    onChange={(e) => updateContact(i, 'email', e.target.value)}
                    type="email"
                    placeholder="Email"
                    className="w-full p-2 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addContact}
            className="text-xs font-bold text-blue-600 flex items-center hover:underline"
          >
            <Plus size={14} className="mr-1" />
            Add Another Contact
          </button>
        </div>
      </div>

      {/* Supply */}
      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-3">
          <Hammer size={14} className="text-amber-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">4. Supply Side</span>
        </div>
        <div className="space-y-3">
          {suppliers.map((s, i) => (
            <div key={i} className="bg-white p-3 rounded-lg border border-amber-200 relative">
              {suppliers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSupplier(i)}
                  className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  value={s.trade}
                  onChange={(e) => updateSupplier(i, 'trade', e.target.value)}
                  type="text"
                  placeholder="Trade (e.g. Electrical)"
                  className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <input
                  value={s.company}
                  onChange={(e) => updateSupplier(i, 'company', e.target.value)}
                  type="text"
                  placeholder="Company Name"
                  className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  value={s.contact}
                  onChange={(e) => updateSupplier(i, 'contact', e.target.value)}
                  type="text"
                  placeholder="Contact Person"
                  className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <input
                  value={s.interaction}
                  onChange={(e) => updateSupplier(i, 'interaction', e.target.value)}
                  type="text"
                  placeholder="Interaction (e.g. Quoted)"
                  className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center border border-gray-200 rounded-lg px-2 focus-within:ring-1 focus-within:ring-amber-400">
                  <Phone size={11} className="text-gray-400 shrink-0" />
                  <input
                    value={s.phone}
                    onChange={(e) => updateSupplier(i, 'phone', e.target.value)}
                    type="tel"
                    placeholder="Phone"
                    className="w-full p-2 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg px-2 focus-within:ring-1 focus-within:ring-amber-400">
                  <Mail size={11} className="text-gray-400 shrink-0" />
                  <input
                    value={s.email}
                    onChange={(e) => updateSupplier(i, 'email', e.target.value)}
                    type="email"
                    placeholder="Email"
                    className="w-full p-2 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center border border-gray-200 rounded-lg px-2 focus-within:ring-1 focus-within:ring-amber-400">
                  <Globe size={11} className="text-gray-400 shrink-0" />
                  <input
                    value={s.website}
                    onChange={(e) => updateSupplier(i, 'website', e.target.value)}
                    type="url"
                    placeholder="Website"
                    className="w-full p-2 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg px-2 focus-within:ring-1 focus-within:ring-amber-400">
                  <MapPin size={11} className="text-gray-400 shrink-0" />
                  <input
                    value={s.officeLocation}
                    onChange={(e) => updateSupplier(i, 'officeLocation', e.target.value)}
                    type="text"
                    placeholder="Office Location"
                    className="w-full p-2 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addSupplier}
            className="text-xs font-bold text-amber-700 flex items-center hover:underline"
          >
            <Plus size={14} className="mr-1" />
            Add Another Contractor
          </button>
        </div>
      </div>

      {/* Field Notes */}
      <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 shadow-sm">
        <div className="flex items-center gap-1.5 mb-3">
          <MessageCircle size={14} className="text-teal-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Field Notes</span>
        </div>
        <textarea
          value={initialComment}
          onChange={(e) => setInitialComment(e.target.value)}
          rows={4}
          placeholder="Add your field observations here..."
          className="w-full p-3 bg-white border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
        />
      </div>

      {/* Photos */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1.5 mb-3">
          <Camera size={14} className="text-gray-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">2. Visual Evidence</span>
        </div>
        <div className="space-y-4">
          {PHOTO_CATS.map(({ key, label }) => {
            const catPhotos: PhotoItem[] = photos[key].map((url) => ({ url, label }))
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">{label}</span>
                  <div className="flex items-center gap-2">
                    {uploadingCat === key && (
                      <Loader2 size={12} className="animate-spin text-gray-400" />
                    )}
                    <input
                      ref={photoInputRefs[key]}
                      type="file"
                      accept="image/*"
                      
                      multiple
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, key)}
                    />
                    <button
                      type="button"
                      disabled={uploadingCat !== null}
                      onClick={() => photoInputRefs[key].current?.click()}
                      className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-2 py-1 transition-colors disabled:opacity-40"
                    >
                      <Plus size={11} /> Add
                    </button>
                  </div>
                </div>
                <PhotoGrid
                  photos={catPhotos}
                  columns={4}
                  emptyText="No photos yet."
                  onDelete={(url) => handlePhotoDelete(key, url)}
                  deleting={deletingUrl}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="flex-1 bg-gray-900 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-black transition-colors text-sm shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
          >
            <Save size={15} />
            {pending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

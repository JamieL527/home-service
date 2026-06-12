'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { createReferralLead } from '@/app/actions/jobs-admin'

const PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'MLS']
const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0', P1: 'Phase 1', P2: 'Phase 2',
  P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5', MLS: 'MLS',
}

type StaffUser = { id: string; firstName: string | null; lastName: string | null; email: string }

export function NewReferralLeadButton({ staffUsers }: { staffUsers: StaffUser[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const start = fd.get('timelineStart') as string
      const end = fd.get('timelineEnd') as string
      const timeline = [start && `Start: ${start}`, end && `End: ${end}`].filter(Boolean).join(' / ')

      await createReferralLead({
        address: fd.get('address') as string,
        businessName: (fd.get('businessName') as string) || undefined,
        phase: (fd.get('phase') as string) || undefined,
        contactName: (fd.get('contactName') as string) || undefined,
        contactPhone: (fd.get('contactPhone') as string) || undefined,
        contactEmail: (fd.get('contactEmail') as string) || undefined,
        serviceType: fd.get('serviceType') as string,
        contractorType: fd.get('contractorType') as string,
        scope: fd.get('scope') as string,
        timeline,
        ownerId: (fd.get('ownerId') as string) || undefined,
      })
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        <Plus size={14} />
        New Referral Lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-gray-900">New Referral Lead</h2>
                <p className="text-xs text-gray-400 mt-0.5">Confirmed job — skips collection, evaluation and marketing</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Project Info */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Project Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input name="address" required placeholder="123 Main St, Toronto, ON" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Client Name</label>
                    <input name="businessName" placeholder="e.g. John Smith" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Phase</label>
                    <select name="phase" className={inputCls}>
                      <option value="">— Select Phase —</option>
                      {PHASES.map(p => (
                        <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Owner */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Responsible</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">
                    Owner <span className="text-red-500">*</span>
                  </label>
                  <select name="ownerId" required className={inputCls}>
                    <option value="">— Select owner —</option>
                    {staffUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.firstName || u.lastName ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Contact Info */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Contact Info</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Contact Name</label>
                    <input name="contactName" placeholder="Name" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Phone</label>
                    <input name="contactPhone" placeholder="416-xxx-xxxx" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Email</label>
                    <input name="contactEmail" type="email" placeholder="email@example.com" className={inputCls} />
                  </div>
                </div>
              </section>

              {/* Job Details */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Job Details</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      Project Type <span className="text-red-500">*</span>
                    </label>
                    <input name="serviceType" required placeholder="e.g. Basement Waterproofing" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">
                      Contractor Type <span className="text-red-500">*</span>
                    </label>
                    <input name="contractorType" required placeholder="e.g. Plumber / Electrician" className={inputCls} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">
                    Scope of Work <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="scope"
                    required
                    rows={3}
                    placeholder="Describe the scope of work..."
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Timeline Start</label>
                    <input name="timelineStart" type="date" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">Timeline End</label>
                    <input name="timelineEnd" type="date" className={inputCls} />
                  </div>
                </div>
              </section>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

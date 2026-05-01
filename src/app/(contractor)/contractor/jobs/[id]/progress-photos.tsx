'use client'

import { useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addProgressPhoto, removeProgressPhoto } from '@/app/actions/contractor-jobs'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { Camera, Loader2, Plus } from 'lucide-react'

export function ProgressPhotos({
  jobId,
  initialUrls,
  canEdit,
}: {
  jobId: string
  initialUrls: string[]
  canEdit: boolean
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    // Show local previews immediately
    const previews = files.map(f => URL.createObjectURL(f))
    setUrls(prev => [...prev, ...previews])

    setUploading(true)
    const supabase = createClient()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const preview = previews[i]
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('job-photos').upload(path, file, { upsert: false })
      if (error) continue
      const { data } = supabase.storage.from('job-photos').getPublicUrl(path)
      const realUrl = data.publicUrl
      // Replace blob preview with real URL
      setUrls(prev => prev.map(u => u === preview ? realUrl : u))
      startTransition(async () => { await addProgressPhoto(jobId, realUrl) })
    }
    setUploading(false)
  }

  function handleDelete(url: string) {
    setDeleting(url)
    startTransition(async () => {
      await removeProgressPhoto(jobId, url)
      setUrls((prev) => prev.filter((u) => u !== url))
      setDeleting(null)
    })
  }

  return (
    <div className="space-y-3">
      <PhotoGrid
        photos={urls.map((url) => ({ url }))}
        columns={3}
        emptyText="No photos uploaded."
        onDelete={canEdit ? handleDelete : undefined}
        deleting={deleting}
      />

      {canEdit && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm font-semibold text-primary border border-border rounded-xl px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
              : <><Camera size={15} /><Plus size={11} className="-ml-1" /> Add Photos</>}
          </button>
        </>
      )}
    </div>
  )
}

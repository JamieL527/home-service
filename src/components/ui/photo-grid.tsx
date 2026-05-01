'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export type PhotoItem = { url: string; label?: string }

export function PhotoGrid({
  photos,
  columns = 3,
  emptyText = 'No photos.',
  onDelete,
  deleting,
}: {
  photos: PhotoItem[]
  columns?: 3 | 4
  emptyText?: string
  onDelete?: (url: string) => void
  deleting?: string | null
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const close = useCallback(() => setLightboxIndex(null), [])
  const prev = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)),
    [photos.length],
  )
  const next = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null)),
    [photos.length],
  )

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, close, prev, next])

  // Keep lightbox index in range if photos array shrinks (after delete)
  useEffect(() => {
    if (lightboxIndex !== null && lightboxIndex >= photos.length) {
      setLightboxIndex(photos.length > 0 ? photos.length - 1 : null)
    }
  }, [photos.length, lightboxIndex])

  if (photos.length === 0 && !onDelete) {
    return <p className="text-xs text-gray-400 italic">{emptyText}</p>
  }

  const gridCols = columns === 4 ? 'grid-cols-4' : 'grid-cols-3'

  return (
    <>
      {photos.length === 0 ? (
        <p className="text-xs text-gray-400 italic">{emptyText}</p>
      ) : (
        <div className={`grid ${gridCols} gap-2`}>
          {photos.map((photo, i) => (
            <div key={photo.url} className="relative aspect-square">
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="w-full h-full rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.label ?? `Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {photo.label && (
                  <span className="absolute top-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                    {photo.label}
                  </span>
                )}
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(photo.url) }}
                  disabled={deleting === photo.url}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors disabled:opacity-40"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X size={20} />
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].label ?? `Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-white/60 text-xs text-center mt-3">
              {photos[lightboxIndex].label && (
                <span className="font-semibold text-white/80 mr-1">
                  {photos[lightboxIndex].label} ·
                </span>
              )}
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </>
  )
}

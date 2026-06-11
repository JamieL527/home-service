'use client'

export function QuoteDownloadButton({ pdfUrl, filename }: { pdfUrl: string; filename: string }) {
  async function download() {
    const res = await fetch(pdfUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={download}
      style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 13, padding: '8px 13px', cursor: 'pointer' }}
    >
      ⬇ Download
    </button>
  )
}

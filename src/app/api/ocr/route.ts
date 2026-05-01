import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_VISION_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'OCR not configured' }, { status: 500 })
  }

  let base64: string
  try {
    const body = await req.json()
    base64 = body.base64
    if (!base64) throw new Error('missing base64')
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const visionRes = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION' }],
        }],
      }),
    }
  )

  if (!visionRes.ok) {
    return NextResponse.json({ error: 'Vision API error' }, { status: 502 })
  }

  const data = await visionRes.json()
  const text: string = data.responses?.[0]?.fullTextAnnotation?.text ?? ''
  return NextResponse.json({ text })
}

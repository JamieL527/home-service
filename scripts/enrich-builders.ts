import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Keep if: has company suffix (Inc, Ltd, Corp...) OR has construction keyword
// This captures real builders even if their name has no construction keyword
const COMPANY_SUFFIX_RE = /\b(inc\.?|ltd\.?|corp\.?|limited|group|co\.|llc|lp|holdings?|enterprises?|associates?|partners?|properties|realty|services|solutions|industries|management)\b/i
const CONSTRUCTION_KEYWORD_RE = /construction|contracting|contractor|builder|building|renovations?|developments?|homes|remodeling|restoration|framing|concrete|masonry|roofing|plumbing|electrical|carpentry|landscaping|interiors?|exteriors?/i
const REAL_BUILDER_RE = { test: (n: string) => COMPANY_SUFFIX_RE.test(n) || CONSTRUCTION_KEYWORD_RE.test(n) }

async function fetchAllBuilderNames(): Promise<string[]> {
  const allNames = new Set<string>()
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('permits')
      .select('builder_name')
      .not('builder_name', 'is', null)
      .neq('builder_name', '')
      .range(offset, offset + 999)
    if (error || !data || data.length === 0) break
    data.forEach(r => { if (r.builder_name?.trim()) allNames.add(r.builder_name.trim()) })
    if (data.length < 1000) break
    offset += 1000
  }
  return [...allNames].filter(n => REAL_BUILDER_RE.test(n))
}

async function enrichBuilder(name: string): Promise<{ website: string | null; email: string | null; phone: string | null }> {
  const prompt = `I have a Toronto-based builder named "${name}". Please find their official website and then get their contact email and phone number from the contact page. Return ONLY a JSON object with keys: website, email, phone. If not found, use null. No explanation, just JSON.`

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: prompt,
    }),
  })

  if (!response.ok) {
    console.error(`  OpenAI error:`, response.status, await response.text())
    return { website: null, email: null, phone: null }
  }

  const data = await response.json()
  const outputText = data.output
    ?.filter((o: { type: string }) => o.type === 'message')
    ?.flatMap((o: { content: { type: string; text: string }[] }) => o.content)
    ?.filter((c: { type: string }) => c.type === 'output_text')
    ?.map((c: { text: string }) => c.text)
    ?.join('') ?? ''

  try {
    const jsonMatch = outputText.match(/\{[\s\S]*?\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    console.error(`  JSON parse error:`, outputText.slice(0, 200))
  }
  return { website: null, email: null, phone: null }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  console.log('Fetching builder names from permits...')
  const names = await fetchAllBuilderNames()
  console.log(`Found ${names.length} real builders`)

  const existing = await prisma.builder.findMany({ select: { name: true } })
  const existingNames = new Set(existing.map(b => b.name))
  const toProcess = names.filter(n => !existingNames.has(n))
  console.log(`${toProcess.length} to process (${existingNames.size} already done)\n`)

  let found = 0, notFound = 0, errors = 0

  for (let i = 0; i < toProcess.length; i++) {
    const name = toProcess[i]
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${name} ... `)

    try {
      const result = await enrichBuilder(name)
      const status = result.website || result.email || result.phone ? 'found' : 'not_found'
      if (status === 'found') found++; else notFound++

      await prisma.builder.upsert({
        where: { name },
        update: { website: result.website, email: result.email, phone: result.phone, status },
        create: { name, website: result.website, email: result.email, phone: result.phone, status },
      })

      console.log(status === 'found'
        ? `✓ ${result.website ?? ''} ${result.email ?? ''} ${result.phone ?? ''}`
        : '— not found')
    } catch (e) {
      console.error('ERROR:', e)
      errors++
      await prisma.builder.upsert({
        where: { name },
        update: { status: 'error' },
        create: { name, status: 'error' },
      })
    }

    await sleep(1000)
  }

  console.log(`\n✅ Done: ${found} found, ${notFound} not found, ${errors} errors`)
  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

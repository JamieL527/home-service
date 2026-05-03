import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const STREET_TYPES = new Set([
  'STREET', 'ST', 'AVENUE', 'AVE', 'BOULEVARD', 'BLVD', 'ROAD', 'RD',
  'DRIVE', 'DR', 'WAY', 'LANE', 'LN', 'COURT', 'CT', 'PLACE', 'PL',
  'CRESCENT', 'CRES', 'CIRCLE', 'CIR', 'TRAIL', 'TR', 'TERRACE', 'TER',
  'GATE', 'GROVE', 'PARK', 'SQUARE', 'SQ', 'HIGHWAY', 'HWY',
])

function parseStreetAddress(address: string): { streetNum: string; streetName: string } | null {
  const firstPart = address.split(',')[0].trim()
  const tokens = firstPart.split(/\s+/)
  if (tokens.length < 2) return null
  if (!/^\d+/.test(tokens[0])) return null
  const streetNum = tokens[0].match(/^\d+/)?.[0] ?? tokens[0]
  const nameTokens: string[] = []
  for (let i = 1; i < tokens.length; i++) {
    const upper = tokens[i].toUpperCase().replace(/\.$/, '')
    if (STREET_TYPES.has(upper)) break
    nameTokens.push(tokens[i])
  }
  if (!nameTokens.length) return null
  return { streetNum, streetName: nameTokens.join(' ') }
}

export async function POST(req: NextRequest) {
  let address: string
  try {
    const body = await req.json()
    address = body.address
    if (!address) throw new Error('missing address')
  } catch {
    return NextResponse.json({ permit: null, allPermits: [], count: 0, error: 'Invalid request' }, { status: 400 })
  }

  const parsed = parseStreetAddress(address)
  if (!parsed) return NextResponse.json({ permit: null, allPermits: [], count: 0 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ permit: null, allPermits: [], count: 0, error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('permits')
    .select('permit_num, permit_type, status, application_date, est_const_cost, description, builder_name')
    .eq('street_num', parsed.streetNum)
    .ilike('street_name', parsed.streetName)
    .order('application_date', { ascending: false })

  if (error) {
    console.error('Permits query error:', error)
    return NextResponse.json({ permit: null, allPermits: [], count: 0 })
  }

  const allPermits = data ?? []
  return NextResponse.json({
    permit: allPermits[0] ?? null,
    allPermits,
    count: allPermits.length,
  })
}

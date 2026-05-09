import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const STREET_TYPES = new Set([
  'STREET', 'ST', 'AVENUE', 'AVE', 'BOULEVARD', 'BLVD', 'ROAD', 'RD',
  'DRIVE', 'DR', 'WAY', 'LANE', 'LN', 'COURT', 'CT', 'PLACE', 'PL',
  'CRESCENT', 'CRES', 'CIRCLE', 'CIR', 'TRAIL', 'TR', 'TERRACE', 'TER',
  'GATE', 'GROVE', 'PARK', 'SQUARE', 'SQ', 'HIGHWAY', 'HWY',
])

function stripStreetType(q: string): string {
  const tokens = q.trim().split(/\s+/)
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1].toUpperCase().replace(/\.$/, '')
    if (STREET_TYPES.has(last)) tokens.pop()
    else break
  }
  return tokens.join(' ')
}

function parseAddressQuery(q: string): { streetNum: string; streetName: string } | null {
  const trimmed = q.trim()
  if (!/^\d+\s+/.test(trimmed)) return null
  const tokens = trimmed.split(/\s+/)
  const streetNum = tokens[0]
  const nameTokens: string[] = []
  for (let i = 1; i < tokens.length; i++) {
    const upper = tokens[i].toUpperCase().replace(/\.$/, '')
    if (STREET_TYPES.has(upper)) break
    nameTokens.push(tokens[i])
  }
  if (!nameTokens.length) return null
  return { streetNum, streetName: nameTokens.join(' ') }
}

const SELECT_FIELDS =
  'id, permit_num, permit_type, status, application_date, est_const_cost, description, builder_name, street_num, street_name, street_type, street_direction, postal, ward_grid, lat, lng'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { q, status, permitType, yearFrom, bounds, page = 1, perPage = 50 } = body

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // ── Viewport / bounds mode ────────────────────────────────────────────────
  if (bounds) {
    const { north, south, east, west } = bounds as {
      north: number; south: number; east: number; west: number
    }

    const { data, count, error } = await supabase
      .from('permits')
      .select(SELECT_FIELDS, { count: 'exact' })
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .gte('lat', south)
      .lte('lat', north)
      .gte('lng', west)
      .lte('lng', east)
      .order('application_date', { ascending: false })
      .range(0, 199)

    if (error) {
      return NextResponse.json({ permits: [], total: 0, overLimit: false, error: error.message }, { status: 500 })
    }

    const total = count ?? 0
    return NextResponse.json({ permits: data ?? [], total, overLimit: total > 200 })
  }

  // ── Text search / filter mode (left panel list) ───────────────────────────
  let query = supabase
    .from('permits')
    .select(SELECT_FIELDS, { count: 'exact' })

  if (q) {
    const parsed = parseAddressQuery(q)
    if (parsed) {
      query = query
        .eq('street_num', parsed.streetNum)
        .ilike('street_name', `%${parsed.streetName}%`)
    } else {
      const nameQ = stripStreetType(q)
      query = query.or(
        `permit_num.ilike.%${q}%,street_name.ilike.%${nameQ}%,description.ilike.%${q}%,builder_name.ilike.%${q}%`
      )
    }
  }

  if (status) query = query.eq('status', status)
  if (permitType) query = query.eq('permit_type', permitType)
  if (yearFrom) query = query.gte('application_date', `${yearFrom}-01-01`)

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data, count, error } = await query
    .order('application_date', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json({ permits: [], total: 0, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ permits: data ?? [], total: count ?? 0, page, perPage })
}

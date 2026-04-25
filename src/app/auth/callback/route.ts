import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const response = NextResponse.redirect(new URL('/login', origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const prismaUser = await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' } },
    include: { contractorCompany: true },
  })

  if (!prismaUser) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  if (prismaUser.role === 'CONTRACTOR') {
    const status = prismaUser.contractorCompany?.status
    response.cookies.set('user-role', 'CONTRACTOR', { httpOnly: true, path: '/', sameSite: 'lax' })
    if (status === 'UNVERIFIED_PROFILE') {
      const dest = new URL('/register/business-profile', origin)
      dest.searchParams.set('verified', '1')
      response.headers.set('location', dest.toString())
    } else if (status === 'ACTION_REQUIRED') {
      response.headers.set('location', new URL('/register/business-profile', origin).toString())
    } else if (status === 'PENDING_APPROVAL') {
      response.headers.set('location', new URL('/register/pending', origin).toString())
    } else if (status === 'ACTIVE') {
      response.headers.set('location', new URL('/contractor/overview', origin).toString())
    }
    return response
  }

  return response
}

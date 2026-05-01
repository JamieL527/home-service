import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin',
  SALES: '/sales',
  MARKETING: '/marketing/inbox',
  DATA_COLLECTOR: '/collector',
  CONTRACTOR: '/contractor/overview',
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (!user) {
    if (
      pathname === '/login' ||
      pathname === '/register' ||
      pathname.startsWith('/register/') ||
      pathname === '/accept-invite' ||
      pathname === '/set-password' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password' ||
      pathname === '/auth/callback' ||
      pathname.startsWith('/api/auth/')
    ) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Don't redirect authenticated users away from these routes
  if (
    pathname.startsWith('/register/') ||
    pathname === '/auth/callback' ||
    pathname === '/set-password'
  ) {
    return supabaseResponse
  }

  if (pathname === '/login' || pathname === '/register' || pathname === '/') {
    const role = request.cookies.get('user-role')?.value
    const destination = role ? ROLE_ROUTES[role] : null
    if (destination) {
      const url = request.nextUrl.clone()
      url.pathname = destination
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/collector')) {
    const role = request.cookies.get('user-role')?.value
    if (role !== 'DATA_COLLECTOR') {
      const url = request.nextUrl.clone()
      url.pathname = role && ROLE_ROUTES[role] ? ROLE_ROUTES[role] : '/login'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/contractor')) {
    const role = request.cookies.get('user-role')?.value
    if (role !== 'CONTRACTOR') {
      const url = request.nextUrl.clone()
      url.pathname = role && ROLE_ROUTES[role] ? ROLE_ROUTES[role] : '/login'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/sales')) {
    const role = request.cookies.get('user-role')?.value
    if (role !== 'SALES' && role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = role && ROLE_ROUTES[role] ? ROLE_ROUTES[role] : '/login'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/marketing')) {
    const role = request.cookies.get('user-role')?.value
    if (role !== 'MARKETING' && role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = role && ROLE_ROUTES[role] ? ROLE_ROUTES[role] : '/login'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/admin')) {
    const role = request.cookies.get('user-role')?.value
    const salesAllowed =
      pathname.startsWith('/admin/evaluation') ||
      pathname.startsWith('/admin/parking') ||
      pathname.startsWith('/admin/leads')
    if (role !== 'ADMIN' && !(role === 'SALES' && salesAllowed)) {
      const url = request.nextUrl.clone()
      url.pathname = role && ROLE_ROUTES[role] ? ROLE_ROUTES[role] : '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/validations/password'

const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin',
  SALES: '/sales',
  MARKETING: '/marketing',
  DATA_COLLECTOR: '/collector',
  CONTRACTOR: '/contractor/overview',
}

export async function login(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  let { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Login failed — check if it's due to an unconfirmed email.
    // Users who registered before email-verify flow was added may have valid
    // Prisma records but never confirmed their Supabase email.
    try {
      const adminSupabase = createAdminClient()
      const { data: { users } } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 })
      const sbUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (sbUser && !sbUser.email_confirmed_at) {
        await adminSupabase.auth.admin.updateUserById(sbUser.id, { email_confirm: true })
        const retry = await supabase.auth.signInWithPassword({ email, password })
        if (retry.error) return { error: retry.error.message }
        error = null
      }
    } catch {
      // Admin check failed — fall through to original error
    }
    if (error) return { error: error.message }
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { contractorCompany: true },
  })
  if (!user) {
    await supabase.auth.signOut()
    return { error: 'This account is not registered in the system. Please contact an administrator.' }
  }

  if (user.role === 'CONTRACTOR') {
    const status = user.contractorCompany?.status

    if (status === 'REJECTED') {
      await supabase.auth.signOut()
      return { error: 'Your account has been rejected. Please contact support.' }
    }

    const cookieStore = await cookies()
    cookieStore.set('user-role', 'CONTRACTOR', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    if (status === 'UNVERIFIED_PROFILE') redirect('/register/business-profile')
    if (status === 'PENDING_APPROVAL') redirect('/register/pending')
    if (status === 'ACTION_REQUIRED') redirect('/register/business-profile')
    redirect('/contractor/overview')
  }

  const cookieStore = await cookies()
  cookieStore.set('user-role', user.role, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  redirect(ROLE_ROUTES[user.role] ?? '/')
}

export async function register(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = (formData.get('firstName') as string)?.trim() || null
  const lastName = (formData.get('lastName') as string)?.trim() || null

  const passwordErrors = validatePassword(password)
  if (passwordErrors.length > 0) return { error: passwordErrors[0] }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Registration failed. Please try again.' }

  try {
    const company = await prisma.contractorCompany.create({
      data: { name: '', status: 'UNVERIFIED_PROFILE' },
    })
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        role: 'CONTRACTOR',
        firstName,
        lastName,
        contractorCompanyId: company.id,
      },
    })
  } catch {
    return { error: 'Registration failed. This email may already be in use.' }
  }

  const cookieStore = await cookies()
  cookieStore.set('user-role', 'CONTRACTOR', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  redirect(`/register/verify-email?email=${encodeURIComponent(email)}`)
}

export async function saveBusinessProfile(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated.' }

  const email = user.email.toLowerCase()

  let prismaUser = await prisma.user.findUnique({
    where: { email },
    include: { contractorCompany: true },
  })

  // Fallback: case-insensitive search for legacy accounts
  if (!prismaUser) {
    const found = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { contractorCompany: true },
    })
    prismaUser = found
  }

  if (!prismaUser) return { error: 'Account not found. Please sign out and register again.' }
  if (!prismaUser.contractorCompany) return { error: 'No company record found. Please contact support.' }

  const name = (formData.get('name') as string)?.trim()
  const businessNumber = (formData.get('businessNumber') as string)?.trim()
  const address = (formData.get('address') as string)?.trim()
  const website = (formData.get('website') as string)?.trim() || null
  const tradeType = (formData.get('tradeType') as string)?.trim() || null
  const contactName = (formData.get('contactName') as string)?.trim()
  const contactTitle = (formData.get('contactTitle') as string)?.trim()
  const contactEmail = (formData.get('contactEmail') as string)?.trim()
  const contactPhone = (formData.get('contactPhone') as string)?.trim()
  const wsibNumber = (formData.get('wsibNumber') as string)?.trim()
  const insuranceNumber = (formData.get('insuranceNumber') as string)?.trim()
  const termsAccepted = formData.get('termsAccepted') === 'on'

  if (!name || !businessNumber || !address || !tradeType || !contactName || !contactTitle || !contactEmail || !contactPhone || !wsibNumber || !insuranceNumber) {
    return { error: 'Please fill in all required fields.' }
  }
  if (!termsAccepted) {
    return { error: 'You must accept the Terms & Conditions to continue.' }
  }

  await prisma.contractorCompany.update({
    where: { id: prismaUser.contractorCompany.id },
    data: {
      name,
      businessNumber,
      address,
      website,
      tradeType,
      contactName,
      contactTitle,
      contactEmail,
      contactPhone,
      wsibNumber,
      insuranceNumber,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      status: 'PENDING_APPROVAL',
    },
  })

  redirect('/register/pending')
}

export async function getBusinessProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const prismaUser = await prisma.user.findFirst({
    where: { email: { equals: user.email.toLowerCase(), mode: 'insensitive' } },
    include: { contractorCompany: true },
  })

  const c = prismaUser?.contractorCompany
  if (!c) return null

  return {
    name: c.name ?? '',
    businessNumber: c.businessNumber ?? '',
    address: c.address ?? '',
    website: c.website ?? '',
    tradeType: c.tradeType ?? '',
    contactName: c.contactName ?? '',
    contactTitle: c.contactTitle ?? '',
    contactEmail: c.contactEmail ?? '',
    contactPhone: c.contactPhone ?? '',
    wsibNumber: c.wsibNumber ?? '',
    insuranceNumber: c.insuranceNumber ?? '',
  }
}

export async function resendVerificationEmail(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean } | null> {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) return { error: error.message }
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete('user-role')
  redirect('/login')
}

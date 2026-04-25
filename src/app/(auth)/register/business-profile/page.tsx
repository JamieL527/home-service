import { getBusinessProfile } from '@/app/actions/auth'
import { BusinessProfileForm } from './form'

export default async function BusinessProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>
}) {
  const { verified } = await searchParams
  const initialValues = await getBusinessProfile()
  return <BusinessProfileForm initialValues={initialValues} verified={verified === '1'} />
}

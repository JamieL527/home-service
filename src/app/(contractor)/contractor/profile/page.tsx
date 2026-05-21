import { requireContractorUser } from '@/lib/contractor'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const { company } = await requireContractorUser()

  return (
    <ProfileForm
      company={{
        name: company.name,
        businessNumber: company.businessNumber,
        wsibNumber: company.wsibNumber,
        insuranceNumber: company.insuranceNumber,
        status: company.status,
        tradeType: company.tradeType,
        contactName: company.contactName,
        contactTitle: company.contactTitle,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        website: company.website,
        address: company.address,
        logoUrl: company.logoUrl,
      }}
    />
  )
}

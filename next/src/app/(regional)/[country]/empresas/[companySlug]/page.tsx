import CompanyDetailPage, { generateMetadata as companyMetadata } from '@/components/CompanyDetailPage.server'
type Props = { params: Promise<{ country: string; companySlug: string }> }
export async function generateMetadata({ params }: Props) { return companyMetadata({ params: params.then(value => ({ ...value, collection: 'empresas' })) }) }
export default async function Page({ params }: Props) { return CompanyDetailPage({ params: params.then(value => ({ ...value, collection: 'empresas' })) }) }

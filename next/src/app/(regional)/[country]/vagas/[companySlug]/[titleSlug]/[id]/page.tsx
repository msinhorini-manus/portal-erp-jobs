import JobDetailPage, { generateMetadata as metadata } from '@/components/JobDetailPage.server'
type Props = { params: Promise<{ country: string; companySlug: string; titleSlug: string; id: string }> }
export const dynamic = 'force-dynamic'
function withCollection(props: Props) { return { params: props.params.then(params => ({ ...params, collection: 'vagas' })) } }
export function generateMetadata(props: Props) { return metadata(withCollection(props)) }
export default function Page(props: Props) { return JobDetailPage(withCollection(props)) }

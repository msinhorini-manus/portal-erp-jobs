import { redirect } from 'next/navigation'
import { getSiteContext } from './site-resolver.server'
import { regionalizePath } from './regional-routes'
export async function regionalRedirect(path: string): Promise<never> {
  const { site } = await getSiteContext()
  redirect(regionalizePath(site.url_prefix, path))
}

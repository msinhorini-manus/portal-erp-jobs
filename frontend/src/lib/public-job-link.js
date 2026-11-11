import { getRegionalRuntime } from './regional-runtime.js'
import { publicJobRelativePath } from './public-job-url.js'
export function publicJobLink(job) {
  const runtime = getRegionalRuntime()
  if (!runtime.site?.is_active) throw new Error('Public job context unavailable')
  const relative = publicJobRelativePath(job, runtime.site.locale)
  return `${runtime.basename ? '' : runtime.prefix}${relative}`
}

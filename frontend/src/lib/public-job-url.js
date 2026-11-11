/** Shared pure implementation lives inside the self-contained Next runtime.
 * The legacy SPA bundles this module at build time; production needs no sibling sources.
 */
export { canonicalJobId, fallbackJobSlug, jobCollection, publicJobPath, publicJobRelativePath, validPublicJobSlug } from '../../../next/src/lib/public-job-url-core.js'

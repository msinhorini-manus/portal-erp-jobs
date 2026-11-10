export function globalCanonicalOrigin() {
  const url = new URL(process.env.NEXT_GLOBAL_CANONICAL_ORIGIN || 'https://jobs.portalerp.com')
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Invalid global canonical origin')
  return url.origin
}

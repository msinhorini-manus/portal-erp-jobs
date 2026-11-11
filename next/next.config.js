/** @type {import('next').NextConfig} */
const internalOrigin = (process.env.NEXT_INTERNAL_API_ORIGIN || 'http://127.0.0.1:5000').replace(/\/$/, '')
const nextConfig = {
  // Native slash redirects execute before proxy. Recreate their default rule
  // outside public job detail/short paths, which must never emit Location.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [{ source: '/:path((?![a-z]{2}/(?:vagas|vacantes|jobs)/[^/]+).+)/', destination: '/:path', permanent: true }]
  },
  async rewrites() {
    // Proxy overwrites trusted host/prefix before rewriting to stable Flask API.
    return [
      { source: '/:country([a-z]{2})/api/:collection(jobs|companies|applications|candidates)', destination: `${internalOrigin}/api/:collection/` },
      { source: '/:country([a-z]{2})/api/:path*', destination: `${internalOrigin}/api/:path*` },
    ]
  },
  images: { remotePatterns: [
    { protocol: 'https', hostname: 'jobs.portalerp.com.br' },
    { protocol: 'https', hostname: 'jobs.portalerp.com' },
  ] },
}
module.exports = nextConfig

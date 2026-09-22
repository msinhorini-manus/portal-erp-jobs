/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://jobs.portalerp.com.br/api/:path*',
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jobs.portalerp.com.br',
      },
    ],
  },
}

module.exports = nextConfig

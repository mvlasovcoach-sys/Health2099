/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  headers: async () => [
    {
      source: '/:path*',
      has: [
        {
          type: 'header',
          key: 'accept',
          value: '.*text/html.*',
        },
      ],
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      ],
    },
  ],
};

module.exports = nextConfig;

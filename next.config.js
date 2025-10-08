/** @type {import('next').NextConfig} */
function normalizeBasePath(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '/' || trimmed === '.') {
    return '';
  }
  let normalized = trimmed;
  try {
    if (/^https?:/i.test(normalized)) {
      const url = new URL(normalized);
      normalized = url.pathname || '';
    }
  } catch (error) {
    // Ignore malformed URLs and fall back to the provided value.
  }
  normalized = normalized.replace(/\/+$/, '');
  if (!normalized) {
    return '';
  }
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  return normalized === '/' ? '' : normalized;
}

const isProd = process.env.NODE_ENV === 'production';
const envBasePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASEPATH);
const fallbackBasePath = normalizeBasePath(isProd ? '/prolevel' : '');
const basePath = envBasePath || fallbackBasePath;
const imagePath = basePath ? `${basePath}/_next/image` : '/_next/image';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
  images: {
    path: imagePath,
  },
  env: {
    NEXT_PUBLIC_BASEPATH: basePath,
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

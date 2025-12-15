/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || "production",
  },
  // Only use basePath if staging is on same domain with path prefix
  // For separate domains (staging.app.harborfinance.io), set basePath to ""
  basePath: process.env.NEXT_PUBLIC_USE_BASEPATH === "true" && process.env.NEXT_PUBLIC_APP_ENV === "staging" ? "/staging" : "",
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *;",
          },
        ],
      },
      {
        // CORS headers for manifest.json (required by Safe)
        source: '/manifest.json',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

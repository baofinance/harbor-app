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
    ];
  },
  async rewrites() {
    return [
      // Rewrite any path ending in manifest.json to our API route
      // This handles Safe looking for /admin/manifest.json, /genesis/manifest.json, etc.
      {
        source: '/:path*/manifest.json',
        destination: '/manifest.json',
      },
    ];
  },
};

module.exports = nextConfig;

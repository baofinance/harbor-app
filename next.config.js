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
    NEXT_PUBLIC_USE_TEST2_CONTRACTS:
      process.env.NEXT_PUBLIC_USE_TEST2_CONTRACTS || "false",
  },
  // Only use basePath if staging is on same domain with path prefix
  // For separate domains (staging.app.harborfinance.io), set basePath to ""
  basePath:
    process.env.NEXT_PUBLIC_USE_BASEPATH === "true" &&
    process.env.NEXT_PUBLIC_APP_ENV === "staging"
      ? "/staging"
      : "",
  // Transpile ESM packages that Next.js has trouble with
  transpilePackages: ["ox", "@noble/curves", "@noble/hashes"],
  webpack: (config, { isServer }) => {
    // Fix for @noble/curves ESM import issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Exclude problematic connectors that use broken @noble/curves
    config.resolve.alias = {
      ...config.resolve.alias,
      "@wagmi/connectors/dist/esm/baseAccount": false,
      "@wagmi/connectors/dist/esm/coinbaseWallet": false,
      "@base-org/account": false,
      "@coinbase/wallet-sdk": false,
    };

    return config;
  },
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
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
        source: "/:path*/manifest.json",
        destination: "/manifest.json",
      },
    ];
  },
};

module.exports = nextConfig;

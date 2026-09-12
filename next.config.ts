import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
  }
});

// Check if we are building on Vercel. Vercel automatically sets VERCEL="1"
const isVercel = process.env.VERCEL === '1';
const basePath = isVercel ? "" : "/GATE";

const nextConfig: NextConfig = {
  output: "export", // Enables static export
  compress: false, // Disables gzip to prevent MaxListenersExceededWarning in dev
  basePath: basePath, // Dynamic base path
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath, // Expose to client side code if needed
  },
  images: {
    unoptimized: true, // Required for static export
  },
  // @ts-expect-error - Turbopack top-level property type might be missing in some next.js versions
  turbopack: {},
};

export default withPWA(nextConfig);

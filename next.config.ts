import type { NextConfig } from "next";

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
  turbopack: {},
};

export default nextConfig;

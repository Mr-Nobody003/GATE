import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/GATE',
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;

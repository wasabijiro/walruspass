import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: Ignore lint errors during build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel يدير standalone تلقائياً — لا حاجة له في Vercel
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
};

export default nextConfig;

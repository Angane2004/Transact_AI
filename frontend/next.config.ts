import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
  
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
  
  // Experimental features for performance
  experimental: {
    reactCompiler: true,
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
};

export default nextConfig;

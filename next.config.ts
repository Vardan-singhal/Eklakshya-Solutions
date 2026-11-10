import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.17"],

  async redirects() {
    return [{ source: "/pricing", destination: "/contact", permanent: true }];
  },

  devIndicators: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "framer-motion",
      "gsap",
      "lenis",
      "clsx",
      "tailwind-merge",
    ],
  },
};

export default nextConfig;
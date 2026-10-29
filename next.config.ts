import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;

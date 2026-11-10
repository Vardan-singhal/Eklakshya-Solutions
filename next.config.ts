import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

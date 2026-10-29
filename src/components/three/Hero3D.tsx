"use client";

import dynamic from "next/dynamic";
import { StaticTarget } from "@/components/ui/brand";
import { useTheme } from "@/components/providers/theme";
import { Boundary } from "./Boundary";
import { useCanRender3D, useInView } from "./useGraphics";

// Lazy-loaded: the three.js bundle only downloads on capable devices.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const Fallback = () => (
  <div className="absolute inset-0 grid place-items-center">
    <StaticTarget className="h-[min(110vw,640px)] w-[min(110vw,640px)] max-w-none translate-y-[-8%] lg:translate-x-[22%] lg:translate-y-0" />
  </div>
);

/** Hero 3D target. WebGL on capable desktops; animated SVG everywhere else. */
export function Hero3D() {
  const can3D = useCanRender3D(900);
  const [ref, visible] = useInView<HTMLDivElement>("100px");
  const { theme } = useTheme();

  return (
    <div ref={ref} className="absolute inset-0" data-cursor={can3D ? "Move" : undefined}>
      {can3D ? (
        <Boundary fallback={<Fallback />}>
          <HeroScene active={visible} light={theme === "light"} />
        </Boundary>
      ) : (
        <Fallback />
      )}
    </div>
  );
}

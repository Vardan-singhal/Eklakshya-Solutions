"use client";

import { useEffect, useSyncExternalStore } from "react";
import { heroReadiness } from "@/lib/heroReadiness";
import { StaticTarget } from "@/components/ui/brand";
import { useTheme } from "@/components/providers/theme";
import { Boundary } from "./Boundary";
import { useCanRender3D, useInView } from "./useGraphics";
import HeroScene from "./HeroRenderer";

// Only the lightweight worker bridge is eager; artwork downloads on capable devices.

function Fallback({ failed = false }: { failed?: boolean }) {
  useEffect(() => { if (failed) heroReadiness.fallback(); }, [failed]);
  return (
    <div className="absolute inset-0 grid place-items-center">
      <StaticTarget className="h-[min(110vw,640px)] w-[min(110vw,640px)] max-w-none translate-y-[-8%] lg:translate-x-[22%] lg:translate-y-0" />
    </div>
  );
}

/** Hero 3D target. WebGL on capable desktops; animated SVG everywhere else. */
export function Hero3D() {
  const can3D = useCanRender3D(900, false, heroReadiness.resolveCapability);
  const status = useSyncExternalStore(heroReadiness.subscribe, heroReadiness.getSnapshot, heroReadiness.getServerSnapshot);
  const [ref, visible] = useInView<HTMLDivElement>("100px");
  const { theme } = useTheme();

  return (
    <div ref={ref} className="absolute inset-0" data-hero-visual data-hero-status={status} data-cursor={can3D && status !== "fallback" ? "Move" : undefined}>
      {can3D && status !== "fallback" ? (
        <Boundary fallback={<Fallback failed />}>
          <HeroScene active={visible} light={theme === "light"} onRendered={heroReadiness.rendered} />
        </Boundary>
      ) : (
        <Fallback />
      )}
    </div>
  );
}

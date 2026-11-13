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
      {failed && <p role="status" className="absolute inset-x-0 bottom-4 text-center t-small">3D scene unavailable on this device.</p>}
    </div>
  );
}

/** The same target scene on all WebGL-capable devices. */
export function Hero3D() {
  const can3D = useCanRender3D(heroReadiness.resolveCapability);
  const status = useSyncExternalStore(heroReadiness.subscribe, heroReadiness.getSnapshot, heroReadiness.getServerSnapshot);
  const [ref, visible] = useInView<HTMLDivElement>("100px");
  const { theme } = useTheme();

  return (
    <div ref={ref} id="hero-model" className="hero-scene-panel absolute inset-0" data-hero-visual data-hero-status={status} data-cursor={can3D && status !== "fallback" ? "Move" : undefined}>
      {can3D && status === "pending" && <Fallback />}
      {status === "pending" && <p role="status" className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-center font-mono text-xs text-muted">Preparing 3D scene…</p>}
      {status === "rendered" && <p data-context-loading role="status" className="pointer-events-none absolute inset-0 z-10 place-items-center text-center font-mono text-xs text-muted">Restoring 3D scene…</p>}
      {can3D && status !== "fallback" ? (
        <Boundary fallback={<Fallback failed />}>
          <HeroScene active={visible} light={theme === "light"} onRendered={heroReadiness.rendered} />
        </Boundary>
      ) : (
        <Fallback failed={status === "fallback"} />
      )}
    </div>
  );
}

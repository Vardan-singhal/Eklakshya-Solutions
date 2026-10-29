"use client";

import dynamic from "next/dynamic";
import type { ServiceKind } from "@/data/siteData";
import { SERVICE_ICON } from "@/components/ui/icons";
import { useTheme } from "@/components/providers/theme";
import { Boundary } from "./Boundary";
import { useCanRender3D, useInView } from "./useGraphics";

const ServiceObject = dynamic(() => import("./ServiceObject"), { ssr: false });

/**
 * A floating 3D object for a service. The WebGL canvas is mounted only while the
 * card is near the viewport (and unmounted after) so the page never holds more
 * than a couple of GL contexts. Mobile / low-end devices get an icon + rings.
 */
export function ServiceVisual({ kind, className = "" }: { kind: ServiceKind; className?: string }) {
  const [ref, near] = useInView<HTMLDivElement>("250px");
  const can3D = useCanRender3D(768);
  const { theme } = useTheme();
  const Icon = SERVICE_ICON[kind];

  const fallback = (
    <div className="absolute inset-0 grid place-items-center">
      <div className="grid h-24 w-24 place-items-center rounded-3xl border border-line-strong bg-surface-2 text-accent shadow-[0_20px_60px_-20px_var(--c-ember)]">
        <Icon className="h-10 w-10" strokeWidth={1.5} />
      </div>
    </div>
  );

  return (
    <div ref={ref} className={`relative aspect-square w-full ${className}`} data-cursor={can3D ? "Tilt" : undefined}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        <circle cx="200" cy="200" r="190" stroke="var(--c-ember)" strokeOpacity=".35" strokeDasharray="2 9" />
        <circle cx="200" cy="200" r="140" stroke="var(--c-tint)" strokeOpacity=".4" />
        <circle cx="200" cy="200" r="90" stroke="var(--c-ember)" strokeOpacity=".5" strokeDasharray="60 20" className="origin-center animate-spin-slow" />
        <path d="M200 0v70M200 330v70M0 200h70M330 200h70" stroke="var(--c-fg)" strokeOpacity=".18" />
      </svg>
      {can3D && near ? (
        <Boundary fallback={fallback}>
          <ServiceObject kind={kind} light={theme === "light"} />
        </Boundary>
      ) : (
        fallback
      )}
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import type { ServiceKind } from "@/data/siteData";
import { SERVICE_ICON } from "@/components/ui/icons";
import { useTheme } from "@/components/providers/theme";
import { Boundary } from "./Boundary";
import { useCanRender3D, useInView, useSceneProximity } from "./useGraphics";

const ServiceObject = dynamic(() => import("./ServiceObject"), { ssr: false });
const WebStackScene = dynamic(() => import("./WebStackScene"), { ssr: false });
const AppDevScene = dynamic(() => import("./AppDevScene"), { ssr: false });
const SoftwareDevScene = dynamic(() => import("./SoftwareDevScene"), { ssr: false });
const SaasProductScene = dynamic(() => import("./SaasProductScene"), { ssr: false });
const CatalogueScene = dynamic(() => import("./CatalogueScene"), { ssr: false });
const ImageGenScene = dynamic(() => import("./ImageGenScene"), { ssr: false });
const SeoScene = dynamic(() => import("./SeoScene"), { ssr: false });


/**
 * Download service code ahead of viewport entry once graphics capability is known.
 * GPU preparation is queued; renderers remain until the route unmounts.
 * Prepared offscreen models pause; every supported device uses the same renderer.
 */
export function ServiceVisual({ kind, className = "" }: { kind: ServiceKind; className?: string }) {
  const [ref, renderActive] = useInView<HTMLDivElement>("700px", true);
  const prepare = useSceneProximity(ref);
  const can3D = useCanRender3D();
  const { theme } = useTheme();
  const Icon = SERVICE_ICON[kind];

  const fallback = (
    <div className="absolute inset-0 grid place-items-center">
      <div className="grid h-24 w-24 place-items-center rounded-3xl border border-line-strong bg-surface-2 text-accent shadow-[0_20px_60px_-20px_var(--c-ember)]">
        <Icon className="h-10 w-10" strokeWidth={1.5} />
      </div>
      <span role="status" className="absolute inset-x-0 bottom-6 text-center t-small">3D preview unavailable on this device.</span>
    </div>
  );

  return (
    <div ref={ref} id={`model-${kind}`} className={`scene-viewport relative aspect-square w-full min-w-0 ${className}`} data-service-model={kind} data-render-active={renderActive} data-cursor={can3D ? "Tilt" : undefined}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        <circle cx="200" cy="200" r="190" stroke="var(--c-ember)" strokeOpacity=".35" strokeDasharray="2 9" />
        <circle cx="200" cy="200" r="140" stroke="var(--c-tint)" strokeOpacity=".4" />
        <circle cx="200" cy="200" r="90" stroke="var(--c-ember)" strokeOpacity=".5" strokeDasharray="60 20" className="origin-center animate-spin-slow" />
        <path d="M200 0v70M200 330v70M0 200h70M330 200h70" stroke="var(--c-fg)" strokeOpacity=".18" />
      </svg>
      {can3D !== false && <p data-scene-loading role="status" className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6 text-center font-mono text-xs text-muted">Preparing 3D scene…</p>}
      {can3D && prepare ? (
        <Boundary fallback={fallback} onError={() => { if (ref.current) ref.current.dataset.sceneState = "unavailable"; }}>
          {kind === "web" ? (
            <WebStackScene light={theme === "light"} renderActive={renderActive} />
          ) : kind === "app" ? (
            <AppDevScene light={theme === "light"} renderActive={renderActive} />
          ) : kind === "software" ? (
            <SoftwareDevScene light={theme === "light"} renderActive={renderActive} />
          ) : kind === "saas" ? (
            <SaasProductScene light={theme === "light"} renderActive={renderActive} />
          ) : kind === "catalogue" ? (
            <CatalogueScene light={theme === "light"} renderActive={renderActive} />
          ) : kind === "image" ? (
            <ImageGenScene light={theme === "light"} renderActive={renderActive} />
          ) : kind === "seo" ? (
            <SeoScene light={theme === "light"} renderActive={renderActive} />
          ) : (
            <ServiceObject kind={kind} light={theme === "light"} renderActive={renderActive} />
          )}
        </Boundary>
      ) : (
        can3D === false ? fallback : null
      )}
    </div>
  );
}

"use client";

import { lazy, Suspense } from "react";
import type { ServiceItem } from "@/data/siteData";
import { whenSectionNear } from "@/lib/sectionReadiness";

const Services = lazy(async () => {
  await whenSectionNear("services");
  const servicesModule = await import("./ServicesStack");
  return { default: servicesModule.ServicesStack };
});

/** React retains the complete server HTML while this section awaits hydration. */
export function DeferredServices({ services }: { services: ServiceItem[] }) {
  return <Suspense fallback={null}><Services services={services} /></Suspense>;
}


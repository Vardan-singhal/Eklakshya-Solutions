"use client";

import { domMax, LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Keep the feature context stable while offscreen sections await hydration. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domMax} strict>{children}</LazyMotion>;
}

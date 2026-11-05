"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createModelPreparationQueue } from "@/lib/modelPreparationQueue";

const preparation = createModelPreparationQueue((run) => {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 250 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.requestAnimationFrame(run);
  return () => window.cancelAnimationFrame(id);
});

type PreparationProps = { name: string; children: (onPrepared: () => void) => ReactNode };

/** Queue GPU preparation while allowing renderer code to download in parallel. */
export function ScenePreparation({ name, children }: PreparationProps) {
  const [onPrepared, setOnPrepared] = useState<(() => void) | null>(null);
  useEffect(() => {
    let watchdog = 0;
    const job = preparation.enqueue((complete) => {
      const settled = () => { window.clearTimeout(watchdog); complete(); };
      // A failed asset must not block preparation of the rest of the page.
      watchdog = window.setTimeout(settled, 5000);
      setOnPrepared(() => settled);
    });
    const element = Array.from(document.querySelectorAll<HTMLElement>("[data-service-model]"))
      .find((node) => node.dataset.serviceModel === name);
    const observer = new IntersectionObserver(([entry]) => job.prioritize(entry.isIntersecting), { rootMargin: "2400px" });
    if (element) observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(watchdog);
      job.cancel();
    };
  }, [name]);
  return onPrepared ? children(onPrepared) : null;
}

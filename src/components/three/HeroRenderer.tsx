"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { engine, onReady } from "@/lib/engine";
import { heroPixelRatio, type HeroControls, type HeroWorkerMessage } from "./heroWorkerProtocol";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/** The same artwork runs off the UI thread where supported, with the original renderer as fallback. */
export default function HeroRenderer({ active, light, onRendered }: { active: boolean; light: boolean; onRendered: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const controls = useRef<HeroControls>({ active, light, released: engine.ready });
  const [fallback, setFallback] = useState(() => typeof window !== "undefined" && (
    typeof Worker === "undefined" || !("transferControlToOffscreen" in HTMLCanvasElement.prototype)
  ));

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let worker: Worker | undefined;
    let stopped = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let density: MediaQueryList | undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    const fail = () => {
      if (stopped) return;
      performance.mark("hero:worker-fallback");
      worker?.terminate();
      workerRef.current = null;
      setFallback(true);
    };
    const send = (message: HeroWorkerMessage, transfer: Transferable[] = []) => worker?.postMessage(message, transfer);
    const size = () => ({ width: host.clientWidth, height: host.clientHeight, dpr: heroPixelRatio(window.devicePixelRatio), compact: window.innerWidth < 1024 || window.innerWidth <= window.innerHeight });
    const resize = () => send({ type: "resize", size: size() });
    const watchDensity = () => {
      density?.removeEventListener("change", onDensityChange);
      density = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      density.addEventListener("change", onDensityChange, { once: true });
    };
    const onDensityChange = () => { resize(); watchDensity(); };
    const pointer = { x: 0, y: 0 };
    let previous = { x: NaN, y: NaN, progress: NaN };
    const tick = () => {
      if (stopped) return;
      const input = { x: pointer.x, y: pointer.y, progress: engine.heroProgress };
      if (input.x !== previous.x || input.y !== previous.y || input.progress !== previous.progress) {
        send({ type: "input", ...input });
        previous = input;
      }
      frame = requestAnimationFrame(tick);
    };
    const move = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    let offReady = () => {};
    try {
      worker = new Worker(new URL("./Hero.worker.tsx", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<{ type: string }>) => {
        if (stopped) return;
        const visual = host.closest<HTMLElement>("[data-hero-visual]");
        if (event.data.type === "ready") {
          if (visual) visual.dataset.sceneState = "ready";
          performance.mark("hero:first-frame");
          performance.mark("hero:worker-ready");
          onRendered();
        } else if (event.data.type === "loading") {
          if (visual) visual.dataset.sceneState = "loading";
        } else if (event.data.type === "failed") fail();
      };
      worker.onerror = (event) => { event.preventDefault(); fail(); };
      const offscreen = canvas.transferControlToOffscreen();
      send({ type: "init", canvas: offscreen, size: size(), controls: controls.current }, [offscreen]);
      observer = new ResizeObserver(resize);
      observer.observe(host);
      watchDensity();
      offReady = onReady(() => {
        controls.current.released = true;
        send({ type: "controls", controls: controls.current });
      });
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerdown", move, { passive: true });
      frame = requestAnimationFrame(tick);
    } catch { fail(); }
    return () => {
      stopped = true;
      offReady();
      observer?.disconnect();
      density?.removeEventListener("change", onDensityChange);
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      worker?.terminate();
      workerRef.current = null;
      canvas.remove();
    };
  }, [onRendered, fallback]);

  useEffect(() => {
    controls.current = { ...controls.current, active, light };
    workerRef.current?.postMessage({ type: "controls", controls: controls.current } satisfies HeroWorkerMessage);
  }, [active, light]);

  if (fallback) return <HeroScene active={active} light={light} onRendered={onRendered} />;
  return <div ref={container} className="absolute inset-0" data-hero-renderer="worker" />;
}

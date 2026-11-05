"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

/** Settle first-frame camera/material work even when an offscreen canvas is on demand. */
export function SceneWarmup({ onRendered }: { onRendered?: () => void } = {}) {
  const warmup = useRef({ started: -1, geometries: -1, firstDraw: false, until: 0, marked: false, settled: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useFrame(({ clock, gl, invalidate, frameloop, setFrameloop }) => {
    const current = warmup.current;
    const now = typeof performance !== "undefined" ? performance.now() / 1000 : clock.elapsedTime;
    if (current.started < 0) current.started = now;
    if (gl.info.render.calls > 0 && current.geometries !== gl.info.memory.geometries) {
      current.firstDraw = true;
      current.geometries = gl.info.memory.geometries;
      current.until = now + 0.8;
    }
    if (current.firstDraw && now >= current.until && !current.marked) {
      current.marked = true;
      const name = gl.domElement?.closest("[data-service-model]")?.getAttribute("data-service-model") ?? "service";
      if (typeof performance !== "undefined") performance.mark(`service-model:${name}:ready`);
    }
    // Once uploaded and drawn, let the next scene initialize while this one
    // finishes its bounded hidden settling. Do not delay every model by 0.8s.
    const finished = (current.firstDraw && now >= current.until) || now - current.started >= 2.5;
    if ((current.firstDraw || finished) && !current.settled) { current.settled = true; onRendered?.(); }
    if (finished && frameloop === "demand") {
      // OrbitControls can invalidate on every camera update, even in demand mode.
      // A prepared, invisible canvas must stop completely. Canvas restores its
      // existing "always" mode when renderActive becomes true again.
      clearTimeout(timer.current);
      timer.current = undefined;
      setFrameloop("never");
      return;
    }
    // Late geometry/assets get their own warm-up; failed assets cannot run forever.
    if ((!current.firstDraw && now - current.started < 2.5) || now < current.until) {
      if (frameloop === "demand") {
        // Hidden settling needs only occasional draws; visible animation stays full rate.
        if (timer.current === undefined) timer.current = setTimeout(() => {
          timer.current = undefined;
          invalidate();
        }, 1000 / 15);
      } else {
        clearTimeout(timer.current);
        timer.current = undefined;
        invalidate();
      }
    }
  });
  return null;
}

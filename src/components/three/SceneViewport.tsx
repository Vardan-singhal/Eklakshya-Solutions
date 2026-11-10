"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { fitPerspectiveFov, installSceneTouchGestures } from "@/lib/responsiveScene";

/** Responsive projection and context recovery; leave all scene artwork and animation intact. */
export function SceneViewport({ fov }: { fov: number }) {
  const { camera, size, gl } = useThree();
  const drawn = useRef(false);
  const lost = useRef(false);
  useLayoutEffect(() => {
    if (!(camera as PerspectiveCamera).isPerspectiveCamera || !size.width || !size.height) return;
    const perspective = camera as PerspectiveCamera;
    const fitted = fitPerspectiveFov(fov, size.width, size.height);
    if (perspective.fov !== fitted) {
      perspective.setFocalLength(0.5 * perspective.getFilmHeight() / Math.tan(fitted * Math.PI / 360));
    }
  }, [camera, fov, size.width, size.height]);

  useEffect(() => {
    const canvas = gl.domElement;
    const host = canvas.closest<HTMLElement>("[data-service-model], [data-hero-visual]");
    const loading = () => { if (host) host.dataset.sceneState = "loading"; drawn.current = false; };
    const onLost = (event: Event) => { event.preventDefault(); lost.current = true; loading(); };
    const onRestored = () => { lost.current = false; gl.info.reset(); loading(); };
    loading();
    const touch = window.matchMedia("(any-pointer: coarse)");
    const previous = canvas.style.touchAction;
    const service = Boolean(canvas.closest("[data-service-model]"));
    if (touch.matches) canvas.style.setProperty("touch-action", service ? "pan-y" : "pan-y pinch-zoom");
    const stopTouches = service ? installSceneTouchGestures(canvas) : () => {};
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      stopTouches();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      canvas.style.setProperty("touch-action", previous);
    };
  }, [gl]);

  useFrame(() => {
    if (drawn.current || lost.current || !gl.info.render.calls) return;
    drawn.current = true;
    const host = gl.domElement.closest<HTMLElement>("[data-service-model], [data-hero-visual]");
    if (host) host.dataset.sceneState = "ready";
  });
  return null;
}

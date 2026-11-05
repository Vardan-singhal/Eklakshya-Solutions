"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Compile shader programs before the first draw, without blocking on driver completion. */
export function SceneCompilation() {
  const { gl, scene, camera, get, invalidate } = useThree();
  useLayoutEffect(() => {
    let mounted = true;
    const mode = get().frameloop;
    get().setFrameloop("never");
    const resume = () => {
      if (!mounted) return;
      // A visible scene may already have resumed via its Canvas props.
      if (get().frameloop === "never") get().setFrameloop(mode);
      invalidate();
    };
    void Promise.resolve().then(() => mounted ? gl.compileAsync(scene, camera) : undefined).then(resume, resume);
    return () => {
      mounted = false;
      if (get().frameloop === "never") get().setFrameloop(mode);
    };
  }, [gl, scene, camera, get, invalidate]);
  return null;
}

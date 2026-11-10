"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { engine, onReady } from "@/lib/engine";
import { HeroArtwork } from "./HeroArtwork";
import { SceneCompilation } from "./SceneCompilation";
import { HeroFirstFrame } from "./HeroFirstFrame";
import { SceneViewport } from "./SceneViewport";

export default function HeroScene({ active, light, onRendered }: { active: boolean; light: boolean; onRendered: () => void }) {
  const [drawn, setDrawn] = useState(false);
  const [released, setReleased] = useState(() => engine.ready);
  useEffect(() => onReady(() => setReleased(true)), []);
  const firstFrame = useCallback(() => {
    setDrawn(true);
    onRendered();
  }, [onRendered]);
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 9.5], fov: 42, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={!drawn || (active && released) ? "always" : "never"}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <SceneViewport fov={42} />
        <HeroArtwork light={light} />
        <SceneCompilation />
        <HeroFirstFrame onRendered={firstFrame} />
      </Suspense>
    </Canvas>
  );
}

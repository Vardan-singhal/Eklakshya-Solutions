"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

/** Notify after a nonempty draw has had a browser frame to reach the screen. */
export function HeroFirstFrame({ onRendered }: { onRendered: () => void }) {
  const notified = useRef(false);
  const frame = useRef(0);
  const callback = useRef(() => {});
  useEffect(() => {
    let mounted = true;
    notified.current = false;
    // This ref also invalidates callbacks queued before a Strict Mode cleanup.
    const notify = () => {
      if (!mounted) return;
      performance.mark("hero:first-frame");
      onRendered();
    };
    callback.current = notify;
    return () => { mounted = false; window.cancelAnimationFrame(frame.current); };
  }, [onRendered]);
  useFrame(({ gl }) => {
    if (notified.current || gl.info.render.calls === 0) return;
    notified.current = true;
    const notify = callback.current;
    frame.current = window.requestAnimationFrame(notify);
  });
  return null;
}

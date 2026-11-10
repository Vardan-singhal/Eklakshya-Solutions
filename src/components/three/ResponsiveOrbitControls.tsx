"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { OrbitControls, type OrbitControlsProps } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { TOUCH } from "three";
import type { OrbitControls as Controls } from "three-stdlib";

/** Mouse behavior is unchanged. Two-finger touch rotation leaves one-finger scrolling free. */
export const ResponsiveOrbitControls = forwardRef<Controls, OrbitControlsProps>(function ResponsiveOrbitControls(props, ref) {
  const local = useRef<Controls>(null);
  const { gl } = useThree();
  useImperativeHandle(ref, () => local.current!, []);
  useEffect(() => {
    const controls = local.current;
    if (!controls) return;
    const element = controls.domElement ?? gl.domElement;
    const previous = element.style.touchAction;
    const touches = { ...controls.touches };
    const media = window.matchMedia("(any-pointer: coarse)");
    const configure = () => {
      element.style.touchAction = media.matches ? "pan-y" : previous;
      controls.touches = media.matches
        ? { ONE: -1 as TOUCH, TWO: TOUCH.DOLLY_ROTATE }
        : { ...touches };
    };
    configure();
    media.addEventListener("change", configure);
    return () => {
      media.removeEventListener("change", configure);
      element.style.touchAction = previous;
      controls.touches = touches;
    };
  }, [gl, props.touches]);
  return <OrbitControls {...props} ref={local} />;
});

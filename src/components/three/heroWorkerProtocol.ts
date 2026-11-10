export type HeroControls = { active: boolean; light: boolean; released: boolean };
export type HeroSize = { width: number; height: number; dpr: number; compact?: boolean };
export type HeroWorkerMessage =
  | { type: "init"; canvas: OffscreenCanvas; size: HeroSize; controls: HeroControls }
  | { type: "resize"; size: HeroSize }
  | { type: "controls"; controls: HeroControls }
  | { type: "input"; x: number; y: number; progress: number };

/** Match the existing Canvas's [1, 1.5] pixel ratio and first-frame pause. */
export function heroPixelRatio(deviceRatio: number) {
  return Math.max(1, Math.min(deviceRatio || 1, 1.5));
}

export function heroFrameLoop(controls: HeroControls, drawn: boolean) {
  return !drawn || (controls.active && controls.released) ? "always" : "never";
}

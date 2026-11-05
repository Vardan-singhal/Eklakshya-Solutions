/** Shared pacing for scrolling and section entrances; geometry stays unchanged. */
export const SCROLL_MOTION = {
  wheelLerp: 0.075,
  wheelMultiplier: 0.85,
  scrub: 0.45,
  revealDuration: 1.4,
  revealDelay: 0.12,
  headingDuration: 1.5,
  wordStagger: 0.09,
  anchorMinDuration: 0.75,
  anchorMaxDuration: 1.8,
} as const;

/** Gentle acceleration/deceleration without a jump at the start of anchor travel. */
export const scrollEase = (t: number) => t * t * (3 - 2 * t);

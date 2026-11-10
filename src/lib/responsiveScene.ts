/** Preserve desktop framing; expand the vertical frustum only for narrower canvases. */
export function fitPerspectiveFov(baseFov: number, width: number, height: number) {
  if (width <= 0 || height <= 0) return baseFov;
  const aspect = width / height;
  if (aspect >= 1) return baseFov;
  return 2 * Math.atan(Math.tan(baseFov * Math.PI / 360) / Math.min(1, aspect)) * 180 / Math.PI;
}

/** Fit the complete target in the narrow hero panel without changing desktop composition. */
export function heroComposition(width: number, height: number, viewportWidth: number, aspect: number, compact = width < 1024) {
  if (!compact) return { scale: aspect > 1.15 ? 0.86 : 1, side: aspect > 1.15 ? viewportWidth * 0.22 : 0, depthTravel: 1 };
  const viewHeight = 2 * 9.5 * Math.tan(42 * Math.PI / 360);
  const fit = Math.min(viewHeight, viewHeight * width / Math.max(1, height));
  const scale = Math.min(1, fit / 12.4);
  return { scale, side: 0, depthTravel: 0.86 / Math.max(scale, 0.0001) };
}

/** Horizontal gestures control models; vertical gestures continue native page scrolling. */
export function horizontalGesture(dx: number, dy: number, distance = 24): -1 | 0 | 1 {
  if (Math.abs(dx) < distance || Math.abs(dx) <= Math.abs(dy) * 1.2) return 0;
  return dx < 0 ? 1 : -1;
}

/** Reserve explicit multi-touch drags for orbiting without blocking one-finger page scrolling. */
export function installSceneTouchGestures(canvas: HTMLCanvasElement) {
  const move = (event: TouchEvent) => {
    if (event.touches.length > 1 && event.cancelable) event.preventDefault();
  };
  const track = (event: TouchEvent) => {
    const multiple = event.touches.length > 1;
    canvas.dataset.multiTouch = String(multiple);
    if (multiple) canvas.addEventListener("touchmove", move, { passive: false });
    else canvas.removeEventListener("touchmove", move);
    return multiple;
  };
  const start = (event: TouchEvent) => {
    if (track(event) && event.cancelable) event.preventDefault();
  };
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchend", track, { passive: true });
  canvas.addEventListener("touchcancel", track, { passive: true });
  return () => {
    canvas.removeEventListener("touchstart", start);
    canvas.removeEventListener("touchmove", move);
    canvas.removeEventListener("touchend", track);
    canvas.removeEventListener("touchcancel", track);
    delete canvas.dataset.multiTouch;
  };
}

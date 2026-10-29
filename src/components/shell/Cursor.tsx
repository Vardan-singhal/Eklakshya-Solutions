"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { gsap } from "@/lib/gsap";
import { isFinePointer } from "@/lib/engine";

const getOpenDialog = () => document.querySelector<HTMLDialogElement>("dialog[open]");
const getServerDialog = () => null;
function subscribeToDialogs(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { attributes: true, attributeFilter: ["open"], subtree: true });
  return () => observer.disconnect();
}

/**
 * Custom crosshair cursor (fine pointers only). The ring lags behind the dot,
 * grows over interactive elements, inverts the content beneath it (mix-blend-mode:
 * difference) and shows labels from `data-cursor="View|Drag|Scroll|…"`.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const labelText = useRef<HTMLSpanElement>(null);
  const lastPosition = useRef<{ x: number; y: number } | null>(null);
  const activeDialog = useSyncExternalStore(subscribeToDialogs, getOpenDialog, getServerDialog);

  useEffect(() => {
    if (!isFinePointer()) return;
    const r = ring.current;
    const d = dot.current;
    const lt = labelText.current;
    if (!r || !d || !lt) return;

    const html = document.documentElement;
    html.classList.add("has-cursor");

    const pos = { ...(lastPosition.current ?? { x: -100, y: -100 }) };
    const rpos = { ...pos };
    let state = "idle";
    let pressed = false;
    let shown = lastPosition.current !== null;
    if (shown) {
      r.style.opacity = "1";
      d.style.opacity = "1";
      r.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      d.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    }

    const setState = (next: string) => {
      const value = pressed && next !== "label" ? "down" : next;
      if (value === state) return;
      state = value;
      r.dataset.state = value;
    };

    let lastTarget: Element | null = null;
    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      lastPosition.current = { ...pos };
      if (!shown) {
        shown = true;
        r.style.opacity = "1";
        d.style.opacity = "1";
        rpos.x = pos.x;
        rpos.y = pos.y;
      }
      const t = e.target as Element | null;
      if (t === lastTarget) return;
      lastTarget = t;

      const labelEl = t?.closest?.("[data-cursor]");
      const text = labelEl?.getAttribute("data-cursor") ?? "";
      if (text) {
        lt.textContent = text;
        setState("label");
      } else if (t?.closest?.("input,textarea,select")) setState("text");
      else if (t?.closest?.("a,button,[role='button'],summary,label")) setState("link");
      else setState("idle");
    };
    const onDown = () => {
      pressed = true;
      if (state !== "label") setState("down");
    };
    const onUp = () => {
      pressed = false;
      if (state === "down") setState("idle");
    };
    const onLeave = () => {
      shown = false;
      r.style.opacity = "0";
      d.style.opacity = "0";
    };

    const tick = () => {
      rpos.x += (pos.x - rpos.x) * 0.2;
      rpos.y += (pos.y - rpos.y) * 0.2;
      r.style.transform = `translate3d(${rpos.x}px, ${rpos.y}px, 0)`;
      d.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    };
    gsap.ticker.add(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      html.classList.remove("has-cursor");
    };
  }, [activeDialog]);

  const cursor = (
    <>
      <div
        ref={ring}
        data-state="idle"
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="group pointer-events-none fixed left-0 top-0 z-[300] transition-opacity duration-300"
      >
        <div className="-ml-[18px] -mt-[18px] h-9 w-9 rounded-full border border-white mix-blend-difference transition-all duration-300 ease-out group-data-[state=down]:scale-75 group-data-[state=label]:scale-0 group-data-[state=link]:scale-[1.9] group-data-[state=link]:bg-white group-data-[state=text]:scale-[0.25]" />
        <div className="absolute left-0 top-0 -ml-[44px] -mt-[44px] grid h-[88px] w-[88px] scale-50 place-items-center rounded-full bg-ember text-on-accent opacity-0 transition-all duration-300 ease-out group-data-[state=label]:scale-100 group-data-[state=label]:opacity-100">
          <span ref={labelText} className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" />
        </div>
      </div>
      <div
        ref={dot}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className="pointer-events-none fixed left-0 top-0 z-[301] -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-ember transition-opacity duration-300"
      />
    </>
  );

  // Native dialogs sit above every ordinary z-index. Keep the cursor in that same
  // top layer while a dialog is open, then restore its normal position on close.
  return activeDialog ? createPortal(cursor, activeDialog) : cursor;
}

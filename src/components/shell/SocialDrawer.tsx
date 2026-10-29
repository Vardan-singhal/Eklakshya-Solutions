"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Share2, X } from "lucide-react";
import { engine } from "@/lib/engine";
import { SITE, whatsappLink } from "@/lib/site";
import type { SocialLinks } from "@/lib/socialLinks";

const platforms = [
  { id: "linkedin", label: "LinkedIn", note: "Connect with us", color: "text-[#0a66c2]" },
  { id: "github", label: "GitHub", note: "Explore our code", color: "text-fg" },
  { id: "whatsapp", label: "WhatsApp", note: "Start a conversation", color: "text-[#168c48] dark:text-[#4ade80]" },
  { id: "instagram", label: "Instagram", note: "See what we're creating", color: "text-[#c13584] dark:text-[#f08cc4]" },
] as const;

/** Local vector brand marks; the installed Lucide version contains utility icons only. */
function SocialIcon({ platform }: { platform: keyof SocialLinks }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {platform === "linkedin" && <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="7.5" cy="8" r="1" fill="currentColor" stroke="none" />
        <path d="M7.5 11v6M11 17v-6m0 2a3 3 0 0 1 6 0v4" />
      </>}
      {platform === "github" && <>
        <path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4a5.07 5.07 0 0 0-.09-3S17.73.65 15 2.48a13.38 13.38 0 0 0-7 0C5.27.65 4.09 1 4.09 1A5.07 5.07 0 0 0 4 4a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 17.37V22" />
      </>}
      {platform === "whatsapp" && <>
        <path d="M20.5 11.7a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.7Z" />
        <path d="m8.5 7.5 1.3 2-1 1.2a9 9 0 0 0 4.5 4.5l1.2-1 2 1.3c-.2 1.2-1.2 1.8-2.3 1.5a11.7 11.7 0 0 1-7.7-7.7C6.2 8.2 6.8 7.2 8 7Z" />
      </>}
      {platform === "instagram" && <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </>}
    </svg>
  );
}

const initialLinks: SocialLinks = {
  linkedin: null,
  github: null,
  instagram: null,
  whatsapp: whatsappLink("Hi Eklakshya, I'd like to discuss a project."),
};

/** Site-wide social drawer. Native dialog handles focus trapping, Escape and page inertness. */
export function SocialDrawer() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<SocialLinks>(initialLinks);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const modal = dialog.current;
    if (!modal) return;
    const html = document.documentElement;
    const triggerButton = trigger.current;
    const previousOverflow = html.style.overflow;
    modal.showModal();
    html.style.overflow = "hidden";
    engine.lenis?.stop();
    closeButton.current?.focus();
    return () => {
      modal.close();
      html.style.overflow = previousOverflow;
      if (engine.ready && !html.classList.contains("menu-open") && !html.classList.contains("is-loading")) engine.lenis?.start();
      triggerButton?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/social-links", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load social links");
        const data = await response.json() as SocialLinks;
        if (!controller.signal.aborted) {
          setLinks(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [open, reload]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Open social media links"
        aria-haspopup="dialog"
        aria-controls="social-drawer"
        aria-expanded={open}
        data-cursor="Connect"
        onClick={() => { setStatus("loading"); setOpen(true); }}
        className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-[80] flex h-14 w-14 items-center justify-center gap-2.5 rounded-full border border-white/20 bg-ember-grad text-on-accent shadow-[0_8px_30px_-8px_var(--c-ember)] transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 sm:right-6 sm:bottom-6 sm:w-auto sm:px-5"
      >
        <Share2 className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" aria-hidden="true" />
        <span className="hidden font-mono text-[11px] font-semibold uppercase tracking-[0.16em] sm:inline">Connect</span>
      </button>

      <dialog
        ref={dialog}
        id="social-drawer"
        aria-labelledby="social-drawer-title"
        aria-describedby="social-drawer-description"
        aria-modal="true"
        data-lenis-prevent
        onCancel={(event) => { event.preventDefault(); setOpen(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        className="social-drawer fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-fg backdrop:bg-black/55 backdrop:backdrop-blur-sm"
      >
        <div className="social-drawer-panel absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto overscroll-contain border-l border-line-strong bg-bg px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] shadow-2xl sm:px-8 sm:pb-8 sm:pt-8">
          <div className="flex items-center justify-between gap-4">
            <p className="t-eyebrow">Stay connected</p>
            <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Close social media drawer" data-cursor="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong transition-colors hover:border-ember hover:text-accent">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-10 sm:mt-14">
            <h2 id="social-drawer-title" className="t-h3">Let&apos;s <span className="text-gradient">connect.</span></h2>
            <p id="social-drawer-description" className="t-body mt-3">Follow our work or say hello. We&apos;re one message away.</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3" aria-busy={status === "loading"}>
            {platforms.map(({ id, label, note, color }) => {
              const href = links[id];
              const content = (
                <>
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface-2 ${color}`}><SocialIcon platform={id} /></span>
                  <span className="mt-4 flex items-center gap-2 text-sm font-semibold">{label}{href && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}</span>
                  <span className="mt-1 text-xs leading-5 text-muted">{href ? note : status === "loading" ? "Loading…" : "Coming soon"}</span>
                </>
              );
              const className = "flex min-w-0 flex-col items-start rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-ember/60 focus-visible:border-ember";
              return href ? (
                <a key={id} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} in a new tab`} data-cursor={label} onClick={() => setOpen(false)} className={className}>{content}</a>
              ) : (
                <button key={id} type="button" disabled aria-label={`${label}, ${status === "loading" ? "loading" : "coming soon"}`} className={`${className} opacity-60`}>{content}</button>
              );
            })}
          </div>

          <div className="mt-4 min-h-6" role="status" aria-live="polite">
            {status === "error" && <p className="t-small">Links couldn&apos;t load. <button type="button" className="link-underline min-h-11 text-accent" onClick={() => { setStatus("loading"); setReload((value) => value + 1); }}>Try again</button></p>}
          </div>

          <div className="mt-auto border-t border-line pt-6">
            <p className="text-sm font-semibold">{SITE.name}</p>
            <p className="t-small mt-1">{SITE.location}</p>
          </div>
        </div>
      </dialog>
    </>
  );
}

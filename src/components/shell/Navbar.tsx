"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV, SITE } from "@/lib/site";
import { engine } from "@/lib/engine";
import { BrandWordmark, TargetLogo } from "@/components/ui/brand";
import { Button } from "@/components/ui/interactive";
import { ThemeToggle } from "./ThemeToggle";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Glass navbar: hides on scroll down, returns on scroll up. Full-screen animated menu on mobile. */
export function Navbar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 30);
      const dy = y - last;
      if (Math.abs(dy) > 8) {
        setHidden(dy > 0 && y > 240);
        last = y;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = () => setOpen(false);
    const t = window.setTimeout(close, 0);
    window.addEventListener("ek:nav-click", close);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("ek:nav-click", close);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("menu-open");
    engine.lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("menu-open");
      if (engine.ready) engine.lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[60] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled ? "border-b border-line bg-bg/65 py-3 backdrop-blur-xl" : "py-5"}`}
      >
        <div className="container-x flex items-center justify-between gap-3 sm:gap-6">
          <Link href="/" className="group flex items-center gap-2.5 sm:gap-3" aria-label="Eklakshya Solutions — home" data-cursor="Home">
            <TargetLogo size={34} className="text-fg transition-transform duration-700 group-hover:rotate-180 sm:h-[38px] sm:w-[38px]" />
            <span className="leading-none" role="img" aria-label="Eklakshya Solutions">
              <BrandWordmark size={28} className="w-[120px] sm:w-[140px]" />
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 xl:flex">
            {NAV.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-cursor={l.label}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                    active ? "text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full border border-line-strong bg-surface"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="link-underline">{l.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden sm:block">
              <Button href="/contact" size="md" cursor="Say hi">
                Start a project
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface/60 backdrop-blur sm:h-11 sm:w-11 xl:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            data-lenis-prevent
            initial={{ clipPath: "circle(0% at calc(100% - 3rem) 2.5rem)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 3rem) 2.5rem)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 3rem) 2.5rem)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[55] flex flex-col justify-between overflow-y-auto bg-bg px-6 pb-8 pt-24 sm:pt-28 xl:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center gap-1 py-4">
              {NAV.map((l, i) => (
                <div key={l.href} className="overflow-hidden">
                  <motion.div
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "110%" }}
                    transition={{ duration: 0.7, delay: 0.15 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={l.href}
                      data-cursor={l.label}
                      onClick={() => setOpen(false)}
                      className={`flex items-baseline gap-3 py-2 font-display text-[clamp(1.75rem,8vw,3.25rem)] font-semibold leading-none tracking-tight ${
                        isActive(pathname, l.href) ? "text-gradient" : "text-fg"
                      }`}
                    >
                      <span className="font-mono text-xs font-normal text-muted">0{i + 1}</span>
                      {l.label}
                    </Link>
                  </motion.div>
                </div>
              ))}
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 border-t border-line pt-6"
            >
              <div className="mb-6 sm:hidden">
                <Button href="/contact" size="lg" className="w-full" cursor="Say hi" onClick={() => setOpen(false)}>
                  Start a project
                </Button>
              </div>
              <div className="space-y-1 font-mono text-xs text-muted">
                <a href={`mailto:${SITE.email}`} className="block text-fg">
                  {SITE.email}
                </a>
                <p>{SITE.location}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

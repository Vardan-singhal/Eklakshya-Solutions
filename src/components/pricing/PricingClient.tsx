"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import type { PricingTier } from "@/data/siteData";
import { Button, TiltCard } from "@/components/ui/interactive";
import { Panel, Section, SectionHeader } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/motion";
import { CheckoutModal } from "./CheckoutModal";

type Currency = "INR" | "USD";
const money = (n: number, c: Currency) => (c === "INR" ? `₹${n.toLocaleString("en-IN")}` : `$${n.toLocaleString("en-US")}`);

/** Three equal tier cards (same height, same padding, same baseline for price/CTA) + a Custom row + FAQ. */
export function PricingClient({ tiers, faqs }: { tiers: PricingTier[]; faqs: { q: string; a: string }[] }) {
  const [currency, setCurrency] = useState<Currency>("INR");
  const [tier, setTier] = useState<PricingTier | null>(null);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <Section id="packages" label="Packages" ariaLabel="Packages" className="!pt-0">
        <h2 className="sr-only">Packages</h2>
        <div className="mb-8 sm:mb-12 flex justify-start">
          <div role="group" aria-label="Currency" className="relative inline-flex rounded-full border border-line-strong bg-surface p-1 sm:p-1.5">
            {(["INR", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={currency === c}
                onClick={() => setCurrency(c)}
                className={`t-label relative rounded-full px-4 py-2 sm:px-6 sm:py-3 font-semibold transition-colors ${currency === c ? "text-on-accent!" : "hover:text-fg"}`}
              >
                {currency === c && <motion.span layoutId="cur-pill" className="absolute inset-0 rounded-full bg-ember-grad" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{c === "INR" ? "₹ INR" : "$ USD"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid items-stretch gap-6 md:gap-8 xl:grid-cols-3">
          {tiers.map((t) => {
            const price = currency === "INR" ? t.priceINR : t.priceUSD;
            const adv = currency === "INR" ? t.advanceINR : t.advanceUSD;
            return (
              <Reveal key={t.id} className="h-full">
                <TiltCard className={`h-full rounded-[1.75rem] ${t.featured ? "gradient-border" : ""}`} max={5}>
                  <div className={`card flex h-full flex-col ${t.featured ? "!border-transparent shadow-[0_40px_100px_-50px_var(--c-ember)]" : ""}`}>
                    <div className={t.badge ? "h-8" : "hidden xl:block xl:h-8"}>
                      {t.badge && (
                        <span className={`t-label inline-block whitespace-nowrap rounded-full px-3 py-1 ${t.featured ? "bg-ember-grad text-on-accent!" : "border border-line-strong"}`}>{t.badge}</span>
                      )}
                    </div>
                    <h3 className="t-h4 mt-4">{t.name}</h3>
                    <p className="t-small mt-3 min-h-12">{t.description}</p>

                    <div className="mt-6 sm:mt-8 overflow-hidden">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.p
                          key={currency}
                          initial={{ y: 40, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -40, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="t-h3"
                        >
                          {money(price, currency)}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                    <p className="t-label mt-2.5 sm:mt-3">
                      Advance <span className="text-accent">{money(adv, currency)}</span> · {t.delivery}
                    </p>

                    <ul className="mt-6 sm:mt-8 flex-1 space-y-3 sm:space-y-4 border-t border-line pt-6 sm:pt-8">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm sm:text-[15px] leading-6">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8 sm:mt-10">
                      <Button onClick={() => setTier(t)} variant={t.featured ? "primary" : "outline"} className="w-full" cursor="Book">
                        Book with {money(adv, currency)}
                      </Button>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>

        {/* Custom */}
        <Reveal className="mt-8">
          <Panel className="flex flex-col items-start justify-between gap-6 sm:gap-8 border-dashed md:flex-row md:items-center">
            <div className="max-w-2xl">
              <p className="t-eyebrow">Custom</p>
              <h3 className="t-h3 mt-3 sm:mt-4">Something bigger, odder or more specific?</h3>
              <p className="t-body mt-3 sm:mt-4">Hardware integrations, multi-warehouse ERPs, custom image models, retainers. We scope it on a call and agree a fixed price with milestones.</p>
            </div>
            <Button href="/contact?service=custom" size="lg" className="w-full sm:w-auto" cursor="Talk">
              Scope your project
            </Button>
          </Panel>
        </Reveal>
      </Section>

      <Section id="faq" label="FAQ" alt labelledBy="faq-title">
        <SectionHeader
          headingId="faq-title"
          eyebrow="Questions"
          title={"Good to\n*know.*"}
          intro="Straight answers on payments, ownership and process."
          action={
            <Link href="/contact" className="link-underline t-label text-accent">
              Ask us directly →
            </Link>
          }
        />
        <Reveal stagger={0.08} y={24} className="border-t border-line">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    className="t-h4 flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    {f.q}
                    <Plus className={`h-6 w-6 shrink-0 text-accent transition-transform duration-500 ${isOpen ? "rotate-[135deg]" : ""}`} aria-hidden />
                  </button>
                </h3>
                <div id={`faq-${i}`} role="region" className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="t-body max-w-2xl pb-6">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </Section>

      <AnimatePresence>{tier && <CheckoutModal key={tier.id} tier={tier} currency={currency} onClose={() => setTier(null)} />}</AnimatePresence>
    </>
  );
}

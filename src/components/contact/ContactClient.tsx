"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SITE, whatsappLink } from "@/lib/site";
import type { ServiceItem } from "@/data/siteData";
import { Chip, Field } from "@/components/ui/forms";
import { Button } from "@/components/ui/interactive";
import { Card, Panel, Section } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/motion";
import { BookingCalendar } from "./BookingCalendar";

const BUDGETS = ["Under ₹50k", "₹50k – 1.5L", "₹1.5L – 5L", "₹5L+", "Not sure yet"];

/** Form on cols 1–7; WhatsApp, calendar and details stacked on cols 8–12. Same card padding throughout. */
export function ContactClient({ services }: { services: Pick<ServiceItem, "id" | "title">[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  // pre-select a service from ?service=…
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("service");
    const match = services.find((s) => s.id === id);
    if (match) {
      const t = window.setTimeout(() => setPicked([match.title]), 0);
      return () => window.clearTimeout(t);
    }
  }, [services]);

  const toggle = (t: string) => setPicked((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, service: picked.join(", "), budget, message, website: trap }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send your message.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <Section id="contact-form" label="Contact" ariaLabel="Contact" className="!pt-0">
      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="sr-only">Project enquiry form</h2>
          <Panel>
            {state === "done" ? (
              <div className="py-16 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mx-auto mb-8 grid h-16 w-16 place-items-center rounded-full bg-ember-grad text-on-accent">
                  <Check className="h-8 w-8" strokeWidth={3} />
                </motion.div>
                <h3 className="t-h3">Message received.</h3>
                <p className="t-body mx-auto mt-4 max-w-sm">Thanks {name.split(" ")[0] || "there"} — we&apos;ll reply within one working day with next steps.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-6 sm:space-y-10">
                <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  <Field label="Your name" name="name" value={name} onChange={setName} required autoComplete="name" />
                  <Field label="Email" name="email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
                  <div className="sm:col-span-2">
                    <Field label="Phone / WhatsApp" name="phone" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
                  </div>
                </div>

                <fieldset>
                  <legend className="t-label mb-3 sm:mb-4">What do you need?</legend>
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {services.map((s) => (
                      <Chip key={s.id} active={picked.includes(s.title)} onClick={() => toggle(s.title)}>
                        {s.title}
                      </Chip>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="t-label mb-3 sm:mb-4">Budget</legend>
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {BUDGETS.map((b) => (
                      <Chip key={b} active={budget === b} onClick={() => setBudget(b)}>
                        {b}
                      </Chip>
                    ))}
                  </div>
                </fieldset>

                <Field label="Tell us about the project" name="message" value={message} onChange={setMessage} textarea rows={5} required />

                {/* honeypot */}
                <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
                  </label>
                </div>

                {state === "error" && (
                  <p role="alert" className="rounded-2xl border border-ember/50 bg-ember/10 p-4 text-sm">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <p className="t-small max-w-xs">We only use your details to reply to this enquiry. NDA on request.</p>
                  <Button type="submit" size="lg" disabled={state === "sending"} className="w-full sm:w-auto" cursor="Send">
                    {state === "sending" ? "Sending…" : "Send enquiry"}
                  </Button>
                </div>
              </form>
            )}
          </Panel>
        </div>

        <div className="space-y-8 lg:col-span-5">
          <Reveal>
            <a
              href={whatsappLink("Hi Eklakshya, I'd like to discuss a project.")}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="Chat"
              className="card group flex items-center justify-between gap-4 transition-colors hover:border-ember"
            >
              <span className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ember-grad text-on-accent">
                  <MessageCircle className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="t-h4 block">Chat on WhatsApp</span>
                  <span className="t-small block">Fastest way to get a quick answer</span>
                </span>
              </span>
              <span aria-hidden className="text-2xl transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>
          </Reveal>

          <Reveal>
            <Card>
              <h3 className="t-h4">Book a discovery call</h3>
              <p className="t-small mb-8 mt-2">Free, 30 minutes, no pressure. Pick a slot (IST).</p>
              <BookingCalendar />
            </Card>
          </Reveal>

          <Reveal>
            <Card className="relative overflow-hidden">
              <svg viewBox="0 0 200 200" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64" fill="none" aria-hidden>
                {[90, 66, 42, 20].map((r, i) => (
                  <circle key={r} cx="100" cy="100" r={r} stroke="var(--c-ember)" strokeOpacity={0.5 - i * 0.08} />
                ))}
                <g className="origin-center animate-spin-slow" style={{ animationDuration: "5s", transformOrigin: "100px 100px" }}>
                  <path d="M100 100 L100 8" stroke="var(--c-tint)" strokeWidth="1.5" />
                </g>
                <circle cx="100" cy="100" r="4" fill="var(--c-ember)">
                  <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
              <ul className="relative space-y-5 text-[15px] leading-6">
                <li className="flex items-center gap-4">
                  <Mail className="h-4 w-4 text-accent" aria-hidden />
                  <a href={`mailto:${SITE.email}`} className="link-underline">
                    {SITE.email}
                  </a>
                </li>
                <li className="flex items-center gap-4">
                  <Phone className="h-4 w-4 text-accent" aria-hidden />
                  <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="link-underline">
                    {SITE.phone}
                  </a>
                </li>
                <li className="flex items-center gap-4">
                  <MapPin className="h-4 w-4 text-accent" aria-hidden />
                  {SITE.location} · working worldwide
                </li>
              </ul>
            </Card>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

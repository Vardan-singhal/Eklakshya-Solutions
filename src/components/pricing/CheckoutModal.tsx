"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Lock, X } from "lucide-react";
import { engine } from "@/lib/engine";
import { type PricingTier } from "@/data/siteData";
import { Field, Chip } from "@/components/ui/forms";
import { Button } from "@/components/ui/interactive";

type Currency = "INR" | "USD";
type Status = "idle" | "processing" | "paid" | "manual" | "error";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const money = (n: number, c: Currency) => (c === "INR" ? `₹${n.toLocaleString("en-IN")}` : `$${n.toLocaleString("en-US")}`);

/** Booking / purchase dialog. Amounts are recalculated on the server; Razorpay confirms via signature + webhook. */
export function CheckoutModal({ tier, currency, onClose }: { tier: PricingTier; currency: Currency; onClose: () => void }) {
  const [mode, setMode] = useState<"advance" | "full">("advance");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const box = useRef<HTMLDivElement>(null);

  const amount =
    currency === "INR" ? (mode === "full" ? tier.priceINR : tier.advanceINR) : mode === "full" ? tier.priceUSD : tier.advanceUSD;
  const balance = (currency === "INR" ? tier.priceINR : tier.priceUSD) - amount;

  useEffect(() => {
    document.documentElement.classList.add("menu-open");
    engine.lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => box.current?.querySelector<HTMLInputElement>("input")?.focus(), 350);
    return () => {
      document.documentElement.classList.remove("menu-open");
      if (engine.ready) engine.lenis?.start();
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [onClose]);

  async function celebrate() {
    const confetti = (await import("canvas-confetti")).default;
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.65 }, colors: ["#e9b949", "#39bfff", "#f5efe3", "#a39e92"] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("processing");
    setMessage("");
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id, currency, mode, name, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start your booking.");

      if (data.mode === "manual") {
        setReference(data.reference);
        setStatus("manual");
        return;
      }

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) throw new Error("Could not load the payment window. Please check your connection and retry.");

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Eklakshya Solutions",
        description: data.description,
        order_id: data.orderId,
        prefill: { name, email, contact: phone },
        theme: { color: "#e9b949" },
        modal: { ondismiss: () => setStatus("idle") },
        handler: async (resp: Record<string, string>) => {
          try {
            const v = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(resp),
            });
            if (!v.ok) throw new Error();
            setReference(`EK-${String(data.bookingId).padStart(5, "0")}`);
            setStatus("paid");
            celebrate();
          } catch {
            setMessage("Payment received but we could not verify it automatically. We will confirm by email shortly.");
            setStatus("error");
          }
        },
      });
      rzp.on("payment.failed", () => {
        setMessage("The payment did not go through. You have not been charged — please try again.");
        setStatus("error");
      });
      rzp.open();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const done = status === "paid" || status === "manual";

  return (
    <motion.div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={`Book ${tier.name}`}
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={box}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="gradient-border relative my-auto w-full max-w-lg rounded-[1.5rem] sm:rounded-[1.75rem] bg-surface p-5 sm:p-8 md:p-10 shadow-2xl"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 sm:right-5 sm:top-5 grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full border border-line-strong hover:border-ember">
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="py-4 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-ember-grad text-on-accent">
              <Check className="h-8 w-8" strokeWidth={3} />
            </motion.div>
            <h3 className="t-h3">{status === "paid" ? "Payment confirmed" : "Booking request received"}</h3>
            <p className="t-body mx-auto mt-4 max-w-sm">
              {status === "paid"
                ? "Your start date is locked. A receipt and onboarding details are on their way to your inbox."
                : "Online payment isn't switched on for this site yet, so no money has been taken. We'll email you a secure payment link shortly."}
            </p>
            <p className="mt-6 inline-block rounded-full border border-line-strong px-4 py-2 font-mono text-xs uppercase tracking-[0.16em]">Reference · {reference}</p>
            <div className="mt-8">
              <Button onClick={onClose} variant="outline" icon={false}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate={false}>
            <p className="t-eyebrow">Book your sprint</p>
            <h3 className="t-h3 mt-3 sm:mt-4 pr-10">{tier.name}</h3>

            <div className="mt-5 sm:mt-6 flex flex-wrap gap-2" role="group" aria-label="Payment option">
              <Chip active={mode === "advance"} onClick={() => setMode("advance")}>
                Advance · {money(currency === "INR" ? tier.advanceINR : tier.advanceUSD, currency)}
              </Chip>
              <Chip active={mode === "full"} onClick={() => setMode("full")}>
                Full · {money(currency === "INR" ? tier.priceINR : tier.priceUSD, currency)}
              </Chip>
            </div>
            <p className="t-small mt-3 sm:mt-4">
              {mode === "advance"
                ? `Pay ${money(amount, currency)} now to lock your start date. The balance of ${money(balance, currency)} is split across milestones.`
                : `Pay the full ${money(amount, currency)} upfront — no further invoices.`}
            </p>

            <div className="mt-5 sm:mt-6 space-y-2">
              <Field label="Your name" name="co-name" value={name} onChange={setName} required autoComplete="name" />
              <Field label="Email" name="co-email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
              <Field label="Phone / WhatsApp" name="co-phone" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
            </div>

            {status === "error" && (
              <p role="alert" className="mt-4 sm:mt-5 rounded-xl border border-ember/50 bg-ember/10 p-3 text-sm">
                {message}
              </p>
            )}

            <div className="mt-6 sm:mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                <Lock className="h-3.5 w-3.5" aria-hidden /> Secured by Razorpay
              </p>
              <Button type="submit" disabled={status === "processing"} className="w-full sm:w-auto" cursor="Pay">
                {status === "processing" ? "Preparing…" : `Pay ${money(amount, currency)}`}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

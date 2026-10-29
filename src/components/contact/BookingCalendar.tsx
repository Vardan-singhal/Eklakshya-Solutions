"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Field } from "@/components/ui/forms";
import { Button } from "@/components/ui/interactive";

const SLOTS = ["11:00 AM", "02:00 PM", "04:30 PM", "07:30 PM"];
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

type Day = { iso: string; date: Date; disabled: boolean };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Pick a day + time for a free 30-minute discovery call (IST). */
export function BookingCalendar() {
  const [days, setDays] = useState<Day[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      const out: Day[] = [];
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      for (let i = 1; i <= 21; i++) {
        const x = new Date(d);
        x.setDate(d.getDate() + i);
        out.push({ iso: iso(x), date: x, disabled: x.getDay() === 0 });
      }
      setDays(out);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) {
      setMsg("Pick a day and a time slot first.");
      setState("error");
      return;
    }
    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, date, time: `${time} IST`, topic: "Project discovery call" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reserve that slot.");
      setState("done");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="py-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-ember-grad text-on-accent">
          <Check className="h-7 w-7" strokeWidth={3} />
        </motion.div>
        <h3 className="font-display text-2xl font-semibold">Slot requested</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {time} IST. We&apos;ll confirm by email with a meeting link.
        </p>
      </div>
    );
  }

  const pad = days.length ? days[0].date.getDay() : 0;

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-7 gap-1.5 text-center" role="group" aria-label="Choose a date">
        {WEEK.map((w, i) => (
          <span key={i} className="pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {w}
          </span>
        ))}
        {Array.from({ length: pad }).map((_, i) => (
          <span key={`p${i}`} />
        ))}
        {days.map((d) => {
          const on = d.iso === date;
          return (
            <button
              key={d.iso}
              type="button"
              disabled={d.disabled}
              aria-pressed={on}
              aria-label={d.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              onClick={() => setDate(d.iso)}
              className={`relative aspect-square rounded-xl text-sm transition-colors ${
                d.disabled ? "cursor-not-allowed text-muted/40" : on ? "text-on-accent" : "hover:bg-surface-2"
              }`}
            >
              {on && <motion.span layoutId="cal-day" className="absolute inset-0 rounded-xl bg-ember-grad" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative font-medium">{d.date.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2" role="group" aria-label="Choose a time">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={time === s}
            onClick={() => setTime(s)}
            className={`rounded-xl border px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${time === s ? "border-ember bg-ember/15 text-fg" : "border-line text-muted hover:border-line-strong"}`}
          >
            {s} IST
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-1">
        <Field label="Your name" name="cal-name" value={name} onChange={setName} required autoComplete="name" />
        <Field label="Email" name="cal-email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
      </div>

      {state === "error" && (
        <p role="alert" className="mt-4 rounded-xl border border-ember/50 bg-ember/10 p-3 text-sm">
          {msg}
        </p>
      )}
      <div className="mt-6">
        <Button type="submit" disabled={state === "sending"} className="w-full" cursor="Book">
          {state === "sending" ? "Reserving…" : "Reserve this slot"}
        </Button>
      </div>
    </form>
  );
}

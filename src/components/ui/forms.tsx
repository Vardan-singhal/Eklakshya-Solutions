"use client";

import type { ChangeEvent } from "react";

/** Floating-label field with an animated gradient underline. */
export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  textarea,
  rows = 4,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  autoComplete?: string;
}) {
  const common = {
    id: name,
    name,
    value,
    required,
    placeholder: " ",
    autoComplete,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    className: "peer w-full bg-transparent pb-3 pt-7 text-base text-fg outline-none placeholder:text-transparent",
  };
  return (
    <div className="relative">
      {textarea ? <textarea rows={rows} {...common} className={`${common.className} resize-none`} /> : <input type={type} {...common} />}
      <label
        htmlFor={name}
        className="pointer-events-none absolute left-0 top-6 origin-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-all duration-300 peer-focus:-translate-y-5 peer-focus:scale-[0.85] peer-focus:text-accent peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:scale-[0.85]"
      >
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <span aria-hidden className="absolute bottom-0 left-0 h-px w-full bg-line-strong" />
      <span aria-hidden className="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-ember-grad transition-transform duration-500 peer-focus:scale-x-100" />
    </div>
  );
}

/** Toggle chip used for service / budget pickers. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-all duration-300 ${
        active ? "border-transparent bg-ember-grad text-on-accent shadow-[0_8px_30px_-10px_var(--c-ember)]" : "border-line-strong text-muted hover:border-ember hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

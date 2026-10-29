import type { ElementType, ReactNode } from "react";
import { SectionLabel } from "./brand";
import { Reveal } from "./motion";
import { SplitText } from "./SplitText";

/**
 * Layout primitives. Every page is built from these so spacing, alignment and
 * hierarchy are identical everywhere:
 *
 *   <Section>        80–128px vertical rhythm, one container, anchors for the dot-nav
 *   <SectionHeader>  eyebrow + H2 (cols 1–7) · intro/action (cols 8–12, bottom-aligned)
 *   <Card>/<Panel>   32/40px (card) and 32/48px (panel) padding, same radius & border
 */

export function Section({
  id,
  label,
  alt = false,
  className = "",
  children,
  labelledBy,
  ariaLabel,
}: {
  id?: string;
  label?: string;
  alt?: boolean;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      id={id}
      data-section={label}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      className={`section-y relative ${alt ? "section-alt" : ""} ${className}`}
    >
      <div className="container-x">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
  action,
  headingId,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  action?: ReactNode;
  headingId?: string;
  compact?: boolean;
}) {
  return (
    <header className={`grid gap-8 lg:grid-cols-12 lg:items-end ${compact ? "mb-10" : "mb-14 md:mb-20"}`}>
      <div className="lg:col-span-7">
        <Reveal>
          <SectionLabel>{eyebrow}</SectionLabel>
        </Reveal>
        <SplitText as="h2" id={headingId} text={title} className="t-h2 mt-6" />
      </div>
      {(intro || action) && (
        <Reveal className="lg:col-span-5 lg:col-start-8" delay={0.1}>
          {intro && <p className="t-lead max-w-md">{intro}</p>}
          {action && <div className={intro ? "mt-6" : ""}>{action}</div>}
        </Reveal>
      )}
    </header>
  );
}

export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function Panel({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={`panel ${className}`}>{children}</Tag>;
}

import Link from "next/link";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/brand";
import { Reveal } from "@/components/ui/motion";
import { SplitText } from "@/components/ui/SplitText";

/**
 * Inner-page hero. Always the same rhythm:
 *   breadcrumb → 32 → eyebrow → 24 → H1 → 32 → intro → 40 → children
 * "lg" uses the H1 style; "md" (long titles: articles, case studies) uses the H2 style.
 */
export function PageHero({
  eyebrow,
  title,
  intro,
  crumbs,
  children,
  size = "lg",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  crumbs?: { name: string; href: string }[];
  children?: ReactNode;
  size?: "lg" | "md";
}) {
  return (
    <section className="relative pb-14 pt-28 sm:pb-20 sm:pt-40 md:pb-24 md:pt-48">
      <div className="container-x">
        {crumbs && (
          <Reveal mode="load" y={12} className="mb-8">
            <nav aria-label="Breadcrumb">
              <ol className="t-label flex flex-wrap items-center gap-2">
                {crumbs.map((c, i) => (
                  <li key={c.href} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden>/</span>}
                    {i === crumbs.length - 1 ? (
                      <span aria-current="page" className="text-fg">
                        {c.name}
                      </span>
                    ) : (
                      <Link href={c.href} className="link-underline hover:text-fg">
                        {c.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </Reveal>
        )}
        <Reveal mode="load" y={14}>
          <SectionLabel>{eyebrow}</SectionLabel>
        </Reveal>
        <SplitText as="h1" mode="load" delay={0.1} text={title} className={`${size === "lg" ? "t-h1" : "t-h2"} mt-6 max-w-5xl`} />
        {intro && (
          <Reveal mode="load" delay={0.5} y={20} className="mt-8 max-w-2xl">
            <p className="t-lead">{intro}</p>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}

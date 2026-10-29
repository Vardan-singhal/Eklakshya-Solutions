import Image from "next/image";
import { Crosshair, Focus, TrendingUp } from "lucide-react";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { STACK_GRID, TIMELINE } from "@/data/siteData";
import { PageHero } from "@/components/sections/PageHero";
import { Timeline } from "@/components/sections/Timeline";
import { JsonLd } from "@/components/ui/JsonLd";
import { SectionLabel } from "@/components/ui/brand";
import { Button, TiltCard } from "@/components/ui/interactive";
import { Card, Section, SectionHeader } from "@/components/ui/layout";
import { Counter, ImageReveal, Reveal, ScrollFill } from "@/components/ui/motion";
import { SkillBar } from "@/components/ui/SkillBar";
import { SplitText } from "@/components/ui/SplitText";

export const metadata = buildMetadata({
  title: "About — a full-stack studio built around one target",
  description:
    "Eklakshya Solutions is a full-stack development studio. Our story, principles and stack: React, Node, Express, MongoDB, PHP, MySQL, Three.js and Tailwind.",
  path: "/about",
});

const PRINCIPLES = [
  { icon: Crosshair, t: "Precision", d: "Clear scope, fixed quotes and clean, tested code. We measure twice and ship once." },
  { icon: Focus, t: "Focus", d: "One objective per project. Every feature has to earn its place by moving that number." },
  { icon: TrendingUp, t: "Results", d: "Success is enquiries, revenue and hours saved — not screens delivered." },
];

const GROUPS = [
  { t: "Front-end", i: ["React", "Next.js", "TypeScript", "Tailwind CSS", "GSAP", "Framer Motion", "Three.js"] },
  { t: "Back-end", i: ["Node.js", "Express", "PHP", "REST & GraphQL", "Razorpay & Stripe", "Webhooks"] },
  { t: "Data", i: ["MongoDB", "MySQL", "PostgreSQL", "Redis", "Prisma / Drizzle"] },
  { t: "Delivery", i: ["Docker", "CI/CD", "Vercel", "Linux VPS", "Playwright testing", "Lighthouse audits"] },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />
      <PageHero
        eyebrow="About the studio"
        title={"A studio built around\n*one target.*"}
        intro="“Ek Lakshya” means one aim. It is how we work: pick the outcome that matters, then build everything toward it."
        crumbs={[{ name: "Home", href: "/" }, { name: "About", href: "/about" }]}
      />

      {/* Story: image cols 1–5 · copy cols 6–12 */}
      <Section id="story" label="Story" labelledBy="story-title" className="!pt-0">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <ImageReveal className="aspect-[4/5] rounded-[2rem] border border-line bg-surface" parallax={8}>
              <Image src="/images/studio.jpg" alt="A dark developer workspace lit by warm orange light" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
            </ImageReveal>
          </div>
          <div className="lg:col-span-7">
            <Reveal>
              <SectionLabel>The story</SectionLabel>
            </Reveal>
            <SplitText as="h2" id="story-title" text={"Software should\n*move numbers.*"} className="t-h2 mt-6" />
            <Reveal stagger={0.12} y={26} className="mt-8 max-w-2xl space-y-5">
              <p className="t-lead">
                Eklakshya started with a simple frustration: too many projects delivered on time and on budget — and still failed, because nobody agreed what “success” meant.
              </p>
              <p className="t-body">
                So every engagement now begins with one question: what is the single outcome this has to achieve? Then we choose proven tools — React, Node, Express, MongoDB, MySQL, PHP — and add
                modern touches like Three.js only where they earn their weight.
              </p>
              <p className="t-body">The result is software that is fast, maintainable and tied to a number you care about.</p>
            </Reveal>
            <Reveal className="mt-8 sm:mt-12 grid max-w-2xl grid-cols-3 gap-3 sm:gap-8 border-t border-line pt-6 sm:pt-8">
              {[
                { v: 48, s: "+", l: "Projects" },
                { v: 7, s: " yrs", l: "Experience" },
                { v: 12, s: "", l: "Countries" },
              ].map((x) => (
                <div key={x.l}>
                  <p className="t-h3">
                    <Counter to={x.v} suffix={x.s} className="text-gradient" />
                  </p>
                  <p className="t-label mt-1.5 sm:mt-2 text-[10px] sm:text-xs">{x.l}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Statement */}
      <Section id="statement" label="Principle" ariaLabel="Our principle" className="!pt-0">
        <ScrollFill
          className="t-h2 max-w-5xl"
          text="We are not an agency with account managers and hand-offs. You work directly with the engineer who designs, builds and ships your product."
        />
      </Section>

      {/* Principles: three equal cards */}
      <Section id="principles" label="Principles" alt ariaLabel="Principles">
        <h2 className="sr-only">Principles</h2>
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {PRINCIPLES.map(({ icon: Icon, t, d }) => (
            <Reveal key={t} className="h-full">
              <TiltCard className="h-full rounded-[1.75rem]">
                <Card className="flex h-full flex-col">
                  <Icon className="h-8 w-8 text-accent" strokeWidth={1.5} aria-hidden />
                  <h3 className="t-h3 mt-12">{t}</h3>
                  <p className="t-body mt-4">{d}</p>
                </Card>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Stack */}
      <Section id="stack" label="Stack" labelledBy="stack-title">
        <SectionHeader headingId="stack-title" eyebrow="Tech stack" title={"Proven tools,\n*sharp execution.*"} intro="Mature, well-documented technology that any competent team can maintain — with modern touches only where they earn their place." />
        <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {STACK_GRID.map((s) => (
            <Reveal key={s.name} y={36} className="h-full">
              <TiltCard className="h-full rounded-[1.75rem]">
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <span className="t-h4 grid h-12 w-12 place-items-center rounded-2xl border border-line-strong text-accent">{s.name[0]}</span>
                    <span className="t-label">{s.level}%</span>
                  </div>
                  <h3 className="t-h4 mt-10">{s.name}</h3>
                  <p className="t-small mb-6 mt-1">{s.note}</p>
                  <div className="mt-auto">
                    <SkillBar level={s.level} />
                  </div>
                </Card>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <div className="mt-14 sm:mt-20 grid gap-8 sm:gap-12 border-t border-line pt-8 sm:pt-12 md:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((g) => (
            <Reveal key={g.t}>
              <h3 className="t-label mb-4 text-fg!">{g.t}</h3>
              <ul className="border-t border-line">
                {g.i.map((x) => (
                  <li key={x} className="border-b border-line py-3 text-[15px] leading-6">
                    {x}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Timeline */}
      <Section id="journey" label="Journey" alt labelledBy="journey-title">
        <SectionHeader headingId="journey-title" eyebrow="The journey" title={"Seven years,\n*one direction.*"} intro="From backend plumbing to full products — each step added a skill we still use on every project." />
        <Timeline steps={TIMELINE} />
        <Reveal className="mt-14 sm:mt-20 flex justify-center">
          <Button href="/contact" size="lg" cursor="Let's talk">
            Work with us
          </Button>
        </Reveal>
      </Section>
    </>
  );
}

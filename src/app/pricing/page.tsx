import { SITE } from "@/lib/site";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { getFaqs, getPricingTiers } from "@/lib/content";
import { PageHero } from "@/components/sections/PageHero";
import { PricingClient } from "@/components/pricing/PricingClient";
import { JsonLd } from "@/components/ui/JsonLd";

export const revalidate = 600;

export const metadata = buildMetadata({
  title: "Pricing & Packages — Fixed-Price Web, App & SaaS Development",
  description:
    "Three transparent packages plus custom scoping. Book your start date with an advance or pay in full — in INR or USD via Razorpay. Fixed quotes, milestone billing, full source ownership.",
  path: "/pricing",
});

export default async function PricingPage() {
  const [tiers, faqs] = await Promise.all([getPricingTiers(), getFaqs()]);
  const offers = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: tiers.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: t.name,
        description: t.description,
        provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
        offers: [
          { "@type": "Offer", price: t.priceINR, priceCurrency: "INR", url: `${SITE.url}/pricing` },
          { "@type": "Offer", price: t.priceUSD, priceCurrency: "USD", url: `${SITE.url}/pricing` },
        ],
      },
    })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <JsonLd data={[offers, faqLd, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }])]} />
      <PageHero
        eyebrow="Pricing"
        title={"Clear scope.\n*Fixed price.*"}
        intro="Choose a package, lock your start date with an advance, and pay the balance against milestones. No hourly surprises."
        crumbs={[{ name: "Home", href: "/" }, { name: "Pricing", href: "/pricing" }]}
      />
      <PricingClient tiers={tiers} faqs={faqs} />
    </>
  );
}

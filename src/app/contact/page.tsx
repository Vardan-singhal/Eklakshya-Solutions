import { SITE } from "@/lib/site";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { getServices } from "@/lib/content";
import { PageHero } from "@/components/sections/PageHero";
import { ContactClient } from "@/components/contact/ContactClient";
import { JsonLd } from "@/components/ui/JsonLd";

export const revalidate = 600;

export const metadata = buildMetadata({
  title: "Contact — Start a Project or Book a Discovery Call",
  description:
    "Tell us what you need — web, app, SaaS, catalogue, visuals or SEO. Send an enquiry, chat on WhatsApp or book a free 30-minute discovery call.",
  path: "/contact",
});

export default async function ContactPage() {
  const services = (await getServices()).map((s) => ({ id: s.id, title: s.title }));
  const ld = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Eklakshya Solutions",
    url: `${SITE.url}/contact`,
    mainEntity: { "@type": "Organization", name: SITE.name, email: SITE.email, telephone: SITE.phone },
  };
  return (
    <>
      <JsonLd data={[ld, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])]} />
      <PageHero
        eyebrow="Contact"
        title={"Let's aim at\n*your target.*"}
        intro="Share the outcome you need. We'll reply within one working day with questions, a rough plan and a fixed-price proposal."
        crumbs={[{ name: "Home", href: "/" }, { name: "Contact", href: "/contact" }]}
      />
      <ContactClient services={services} />
    </>
  );
}

import type { Metadata } from "next";
import { SITE } from "./site";

export function buildMetadata({
  title,
  description,
  path = "/",
  type = "website",
}: {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
}): Metadata {
  const url = `${SITE.url}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE.name, type, locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: `${SITE.url}${item.path}`,
  })),
});

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/brand/full-logo.png`,
  description: SITE.description,
  email: SITE.email,
  telephone: SITE.phone,
  address: { "@type": "PostalAddress", addressLocality: "New Delhi", addressCountry: "IN" },
  contactPoint: [{ "@type": "ContactPoint", contactType: "sales", email: SITE.email, telephone: SITE.phone }],
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
};

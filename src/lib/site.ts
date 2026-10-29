import { publicEnv } from "./env.public";

export const SITE = {
  name: "Eklakshya Solutions",
  url: publicEnv.siteUrl,
  email: "eklaskhyasolutions1906@gmail.com",
  phone: "+919205617576",
  whatsapp: "919205617576",
  location: "New Delhi, India",
  tagline: "One target. Zero misses.",
  description:
    "Eklakshya Solutions is a full-stack development studio building websites, apps, SaaS products, 3D catalogues and AI visuals for startups, manufacturers and growing businesses.",
};

export const NAV = [
  { label: "Services", href: "/services" },
  { label: "Work", href: "/portfolio" },
  { label: "Catalogues", href: "/catalogues" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Journal", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const whatsappLink = (text: string) =>
  `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

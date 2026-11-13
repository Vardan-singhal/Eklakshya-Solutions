import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";

import { themeScript } from "@/lib/theme";
import { initialEntranceScript } from "@/lib/initialEntrance";
import { SITE } from "@/lib/site";
import { getServices } from "@/lib/content";
import { organizationLd, websiteLd } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Preloader } from "@/components/shell/Preloader";
import { PageTransition } from "@/components/shell/PageTransition";
import { Cursor } from "@/components/shell/Cursor";
import { ScrollProgress, SectionDots } from "@/components/shell/ScrollUI";
import { BackgroundField } from "@/components/shell/BackgroundField";
import { Navbar } from "@/components/shell/Navbar";
import { Footer } from "@/components/shell/Footer";
import { SocialDrawer } from "@/components/shell/SocialDrawer";

const displayFont = localFont({ src: [
  { path: "./fonts/clash-display-500.woff2", weight: "500" },
  { path: "./fonts/clash-display-600.woff2", weight: "600" },
  { path: "./fonts/clash-display-700.woff2", weight: "700" },
], variable: "--font-brand-display", display: "swap", preload: true });
const bodyFont = localFont({ src: [
  { path: "./fonts/satoshi-400.woff2", weight: "400" },
  { path: "./fonts/satoshi-500.woff2", weight: "500" },
  { path: "./fonts/satoshi-700.woff2", weight: "700" },
], variable: "--font-brand-sans", display: "swap", preload: true });
const monoFont = localFont({ src: [{ path: "./fonts/jetbrains-mono-latin.woff2", weight: "400 600" }], variable: "--font-brand-mono", display: "swap", preload: true });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Eklakshya Solutions — Full-stack development studio | One target. Zero misses.",
    template: "%s | Eklakshya Solutions",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "full-stack developer",
    "web development",
    "app development",
    "SaaS development",
    "3D catalogue",
    "flipbook catalogue design",
    "AI image generation",
    "SEO services",
    "Next.js developer India",
  ],
  alternates: { canonical: SITE.url },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "Eklakshya Solutions — One target. Zero misses.",
    description: SITE.description,
    url: SITE.url,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Eklakshya Solutions", description: SITE.description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0a" },
    { media: "(prefers-color-scheme: light)", color: "#f5efe3" },
  ],
  width: "device-width",
  initialScale: 1,
};

// The blocking head script applies the resolved theme before first paint.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const services = (await getServices()).slice(0, 5).map((s) => ({ label: s.title, href: `/services#${s.id}` }));
  return (
    <html lang="en" data-initial-entrance="true" className={`is-loading ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: initialEntranceScript }} />
        <noscript>
          <style>{`.preloader{display:none!important}html.is-loading{overflow:auto}`}</style>
        </noscript>
      </head>
      <body>
        <MotionProvider>
        <JsonLd data={[organizationLd, websiteLd]} />
        <a
          href="#main"
          className="sr-only z-[400] rounded-full bg-ember-grad px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SmoothScroll />
        <Preloader />
        <PageTransition>
          <Cursor />
          <ScrollProgress />
          <SectionDots />
          <Navbar />
          <main id="main" className="reveal-main">
            <BackgroundField />
            <div className="relative z-10">{children}</div>
          </main>
          <Footer services={services} />
          <SocialDrawer />
        </PageTransition>
        <div className="grain" aria-hidden="true" />
        </MotionProvider>
      </body>
    </html>
  );
}

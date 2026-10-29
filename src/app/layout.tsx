import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { getServices } from "@/lib/content";
import { organizationLd, websiteLd } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Preloader } from "@/components/shell/Preloader";
import { PageTransition } from "@/components/shell/PageTransition";
import { Cursor } from "@/components/shell/Cursor";
import { ScrollProgress, SectionDots } from "@/components/shell/ScrollUI";
import { BackgroundField } from "@/components/shell/BackgroundField";
import { Navbar } from "@/components/shell/Navbar";
import { Footer } from "@/components/shell/Footer";

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

// Runs before first paint → no flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('ek-theme');if(t!=='light'&&t!=='dark'){t='dark'}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme='dark'}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const services = (await getServices()).slice(0, 5).map((s) => ({ label: s.title, href: `/services#${s.id}` }));
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="dns-prefetch" href="https://api.fontshare.com" />
        <link rel="dns-prefetch" href="https://cdn.fontshare.com" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        {/* Fontshare only returns the first family when two are requested at once → two stylesheets */}
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" />
        <noscript>
          <style>{`.preloader{display:none!important}html.is-loading{overflow:auto}`}</style>
        </noscript>
      </head>
      <body>
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
        </PageTransition>
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}

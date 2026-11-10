/* Content for the whole site. Case studies, metrics and testimonials are
   illustrative placeholders — replace them with real client work. */

import cataloguePages from "./catalogue-pages.json";

export type ServiceKind = "web" | "app" | "software" | "saas" | "catalogue" | "image" | "seo";

export interface ServiceItem {
  id: string;
  kind: ServiceKind;
  title: string;
  category: string;
  tagline: string;
  description: string;
  deliverables: string[];
  features: string[];
  idealFor: string;
  delivery: string;
  from: string;
}

export const SERVICES: ServiceItem[] = [
  {
    id: "web-development",
    kind: "web",
    title: "Web Development",
    category: "DIGITAL EXPERIENCES",
    tagline: "Digital experiences engineered to grow your business.",
    description: "We design and develop high-performance websites and web applications that strengthen your online presence, engage your audience, and turn visitors into customers.",
    deliverables: [
      "Custom-designed, responsive websites tailored to your brand and business goals.",
      "Modern frontend and scalable backend development with seamless integrations.",
      "SEO-friendly architecture, optimized performance, and secure functionality."
    ],
    features: [
      "Custom built",
      "Scalable",
      "Performance-driven"
    ],
    idealFor: "Startups, MSMEs and established businesses building or improving their online presence.",
    delivery: "Planned around your scope",
    from: "Project-based quote"
  },
  {
    id: "app-development",
    kind: "app",
    title: "App Development",
    category: "MOBILE EXPERIENCES",
    tagline: "Keep your customers connected and your teams moving.",
    description: "We build mobile apps for customers and field teams. Reliable offline access and connected workflows keep work moving wherever business happens.",
    deliverables: [
      "One consistent app experience across iOS and Android.",
      "Offline access and reliable sync for teams working on the move.",
      "Secure accounts, payments and notifications that support everyday use."
    ],
    features: [
      "Cross-platform",
      "Connected",
      "Reliable"
    ],
    idealFor: "Businesses serving mobile customers, field teams and on-site operations.",
    delivery: "Planned around your scope",
    from: "Project-based quote"
  },
  {
    id: "software-development",
    kind: "software",
    title: "Software Development",
    category: "BUSINESS SYSTEMS",
    tagline: "Less manual work. More control over your business.",
    description: "We build business software around the way your team works. Connected records and automated workflows reduce repetition and make decisions easier.",
    deliverables: [
      "Inventory, customer and quotation tools shaped around your processes.",
      "Connected records and reporting that reduce duplicate work and errors.",
      "Controlled access, dependable backups and a clear handover for your team."
    ],
    features: [
      "Process-led",
      "Connected",
      "Efficient"
    ],
    idealFor: "MSMEs, manufacturers, distributors and teams outgrowing spreadsheets.",
    delivery: "Planned around your scope",
    from: "Project-based quote"
  },
  {
    id: "saas-product-development",
    kind: "saas",
    title: "SaaS Product Development",
    category: "SAAS PRODUCTS",
    tagline: "Turn a proven idea into a product customers can rely on.",
    description: "We develop subscription products that support your first customers and future growth. Clear onboarding, flexible plans and connected billing make the product easier to run.",
    deliverables: [
      "A focused product built around the problem your customers need solved.",
      "Secure team workspaces with the right access for every user.",
      "Subscriptions, usage tracking and billing that support recurring revenue."
    ],
    features: [
      "Product-led",
      "Scalable",
      "Subscription-ready"
    ],
    idealFor: "Founders, entrepreneurs and businesses turning a proven workflow into a product.",
    delivery: "Planned around your scope",
    from: "Project-based quote"
  },
  {
    id: "catalogue-design",
    kind: "catalogue",
    title: "Catalogue Design & Generation",
    category: "PRODUCT PRESENTATION",
    tagline: "Make every product easier to discover, understand and enquire about.",
    description: "We turn product data into digital catalogues and print-ready layouts. Clear specifications and simple enquiry paths help sales teams move conversations forward.",
    deliverables: [
      "Interactive catalogues that make browsing and product enquiries simple.",
      "Consistent, branded layouts for digital sharing and professional print.",
      "Data-driven updates that keep product information accurate and current."
    ],
    features: [
      "Print + digital",
      "Data-driven",
      "Brand-aligned"
    ],
    idealFor: "Manufacturers, exporters and suppliers presenting extensive product ranges.",
    delivery: "Planned around your scope",
    from: "Project-based quote"
  },
  {
    id: "image-generation",
    kind: "image",
    title: "Image Generation",
    category: "PRODUCT VISUALS",
    tagline: "Present every product with a consistent, considered visual style.",
    description: "We create product imagery from your reference photos and 3D assets. Coordinated scenes and formats keep your catalogue, store and campaigns visually consistent.",
    deliverables: [
      "Product visuals styled around your brand and intended audience.",
      "Background changes and lighting refinements across complete product ranges.",
      "High-resolution images prepared for catalogues, marketplaces and campaigns."
    ],
    features: [
      "On-brand",
      "Consistent",
      "Campaign-ready"
    ],
    idealFor: "Product brands, retailers and exporters creating imagery across multiple channels.",
    delivery: "Planned around your scope",
    from: "Project-based quote"
  },
  {
    id: "seo",
    kind: "seo",
    title: "SEO",
    category: "SEARCH VISIBILITY",
    tagline: "Help the right customers find your business.",
    description: "We improve the structure, content and technical health of your website. Search-focused pages and clear reporting help you reach relevant audiences and understand progress.",
    deliverables: [
      "Prioritised technical improvements that make your website easier to find and use.",
      "Content and page structure aligned with the searches your customers make.",
      "Clear tracking of search visibility, relevant traffic and enquiries."
    ],
    features: [
      "Search-focused",
      "Measurable",
      "Sustainable"
    ],
    idealFor: "B2B companies, service businesses and growing products seeking relevant search traffic.",
    delivery: "Planned around your scope",
    from: "Project-based quote"
  }
];

/* ───────────────────────── Projects ───────────────────────── */

export type ProjectCategory = "Web" | "App" | "SaaS" | "Catalogues" | "Images";
export const PROJECT_FILTERS: ("All" | ProjectCategory)[] = ["All", "Web", "App", "SaaS", "Catalogues", "Images"];

export interface Metric {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
}

export interface ProjectItem {
  slug: string;
  title: string;
  client: string;
  category: ProjectCategory;
  year: string;
  role: string;
  summary: string;
  problem: string;
  solution: string;
  stack: string[];
  results: Metric[];
  cover: string;
  coverAlt: string;
}

export const PROJECTS: ProjectItem[] = [
  {
    slug: "apex-industrial-erp",
    title: "Apex Spares ERP",
    client: "Apex Engineering Works",
    category: "Web",
    year: "2024",
    role: "Design · Full-stack build",
    summary: "One system replacing fourteen spreadsheets across three factories and 45,000 spare parts.",
    problem:
      "Dispatch teams lost around 18 hours a week reconciling stock across spreadsheets, and customers waited days for spare-part quotes.",
    solution:
      "A fast web ERP with instant SKU search, barcode scanning, auto-generated quotation PDFs and real-time stock sync between plants — built to keep working when the factory Wi-Fi doesn't.",
    stack: ["Next.js", "PostgreSQL", "Node.js", "Tailwind CSS", "Redis"],
    results: [
      { value: 84, suffix: "%", label: "faster quote turnaround" },
      { value: 45, suffix: "k", label: "SKUs searchable instantly" },
      { value: 99.9, suffix: "%", label: "uptime across 3 plants", decimals: 1 },
    ],
    cover: "/images/work-erp.jpg",
    coverAlt: "CNC machine throwing orange sparks inside a dark factory",
  },
  {
    slug: "velox-saas-analytics",
    title: "VeloxMetrics",
    client: "Velox Cloud",
    category: "SaaS",
    year: "2024",
    role: "Product · Full-stack build",
    summary: "A developer observability SaaS with team workspaces, real-time alerts and metered billing.",
    problem:
      "Mid-sized dev teams found existing monitoring tools too expensive and too heavy for simple serverless insights.",
    solution:
      "A focused, terminal-inspired dashboard with live event streaming, shareable workspaces and usage-based Stripe subscriptions, launched as an MVP in six weeks.",
    stack: ["React", "Node.js", "Express", "MongoDB", "Stripe", "Three.js"],
    results: [
      { value: 12, suffix: "M", label: "events processed per day" },
      { value: 38, prefix: "$", suffix: "k", label: "MRR within four months" },
      { value: 24, prefix: "<", suffix: "ms", label: "median query latency" },
    ],
    cover: "/images/work-saas.jpg",
    coverAlt: "Glowing orange data network on a dark background",
  },
  {
    slug: "shree-ceramics-3d-catalogue",
    title: "Shree Ceramics Flipbook",
    client: "Shree International Tiles",
    category: "Catalogues",
    year: "2024",
    role: "Design · Flipbook engine",
    summary: "A 64-page interactive catalogue with page-turn physics, SKU bookmarks and WhatsApp enquiries.",
    problem:
      "Sales reps were shipping 12 kg printed catalogues to trade expos and buyers abroad rarely opened the PDFs.",
    solution:
      "A web flipbook with real page turns, instant search, a saved-SKU basket and one-tap WhatsApp enquiry — plus an automated press-ready PDF for print runs.",
    stack: ["Three.js", "React", "Canvas API", "WebP", "Tailwind CSS"],
    results: [
      { value: 310, suffix: "%", label: "more expo enquiries" },
      { value: 9.2, prefix: "₹", suffix: "L", label: "yearly print savings", decimals: 1 },
      { value: 1.2, suffix: "s", label: "to first page on 4G", decimals: 1 },
    ],
    cover: "/images/work-catalogue.jpg",
    coverAlt: "Open catalogue with ceramic tile samples on a dark surface",
  },
  {
    slug: "novatrack-field-app",
    title: "NovaTrack Field App",
    client: "Nova Precision Tools",
    category: "App",
    year: "2023",
    role: "Mobile · Backend",
    summary: "An offline-first maintenance app for 200+ technicians working in low-signal plants.",
    problem:
      "Technicians filled carbon-copy work orders by hand, causing invoice errors and slow sign-offs.",
    solution:
      "A React Native app with offline sync, signature capture, geotagged photos and barcode lookups that reconcile automatically once a signal returns.",
    stack: ["React Native", "TypeScript", "Node.js", "Express", "SQLite"],
    results: [
      { value: 100, suffix: "%", label: "paperless field work" },
      { value: 0, label: "records lost offline" },
      { value: 4.9, suffix: "★", label: "technician rating", decimals: 1 },
    ],
    cover: "/images/work-app.jpg",
    coverAlt: "Smartphone glowing orange in front of industrial machinery",
  },
  {
    slug: "aerodynamics-visuals",
    title: "AeroDynamics Visuals",
    client: "TurbineTech Aerospace",
    category: "Images",
    year: "2023",
    role: "Art direction · Generation",
    summary: "Photoreal 8K renders of turbine components for defence expos — no prototypes required.",
    problem:
      "Photographing physical prototypes took nine weeks and a large budget per assembly before every expo.",
    solution:
      "A fine-tuned image pipeline plus 3D shader passes that produce accurate metallic finishes and lighting from CAD references, art-directed to match the brand.",
    stack: ["Diffusion models", "Custom LoRA", "Blender", "Three.js"],
    results: [
      { value: 92, suffix: "%", label: "faster creative turnaround" },
      { value: 8, suffix: "K", label: "resolution for 20ft banners" },
      { value: 14, label: "bids supported at expos" },
    ],
    cover: "/images/work-render.jpg",
    coverAlt: "Polished metal turbine blade rendered on black with orange highlights",
  },
  {
    slug: "om-flow-control-seo",
    title: "Om Flow Control",
    client: "Om Industrial Valves",
    category: "Web",
    year: "2024",
    role: "SEO · Web build",
    summary: "A programmatic B2B site that took monthly export enquiries from 3 to 140+.",
    problem:
      "A certified valve maker was invisible on Google next to overseas trading middlemen.",
    solution:
      "A static, schema-rich directory covering 650+ valve queries with CAD downloads and comparison tables, built for crawlability and speed.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Schema.org", "MySQL"],
    results: [
      { value: 46, suffix: "×", label: "organic traffic growth" },
      { value: 42, label: "page-one commercial rankings" },
      { value: 140, suffix: "+", label: "monthly export enquiries" },
    ],
    cover: "/images/work-web.jpg",
    coverAlt: "Brass and steel industrial valves on a dark background",
  },
];

/* ───────────────────────── Catalogues ───────────────────────── */

export interface CataloguePlate {
  title: string;
  sub: string;
  image: string;
  imageAlt: string;
  sku: number;
  specs: string[];
  caption?: string;
}

export interface CataloguePageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface CatalogueItem {
  id: string;
  title: string;
  client: string;
  industry: string;
  year: string;
  blurb: string;
  plates: CataloguePlate[];
  pages?: CataloguePageAsset[];
  pdf?: string;
  story?: {
    coverLabel: string;
    introLabel: string;
    highlights: [{ value: string; label: string }, { value: string; label: string }];
    chapterLabel: string;
    invitationLabel: string;
    invitationHeading: string;
    closingLine: string;
  };
}

export const CATALOGUES: CatalogueItem[] = [
  {
    id: "sanway-2026",
    title: "Product Catalogue 2026",
    client: "Sanway",
    industry: "Home & kitchen appliances",
    year: "2026",
    blurb: "Sanway's original product catalogue: kitchen appliances, fans, home and personal care, and heating solutions.",
    plates: [],
    pages: cataloguePages.sanway.pages,
    pdf: cataloguePages.sanway.pdf,
  },
  {
    id: "house-of-sutram",
    title: "Premium Kitchenware & Gifting",
    client: "House of Sutram",
    industry: "Kitchenware & corporate gifting",
    year: "Current edition",
    blurb: "House of Sutram's original catalogue of premium kitchenware and corporate gifting, presented with its original artwork and product details.",
    plates: [],
    pages: cataloguePages.houseOfSutram.pages,
    pdf: cataloguePages.houseOfSutram.pdf,
  },
];

/* ───────────────────────── Blog ───────────────────────── */

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  readTime: string;
  category: string;
  tags: string[];
  cover: string;
  coverAlt: string;
  sections: { heading?: string; paragraphs: string[] }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-manufacturers-are-replacing-pdf-catalogues",
    title: "Why manufacturers are replacing PDF catalogues with interactive flipbooks",
    excerpt:
      "A 50 MB PDF is a terrible sales tool on a factory-floor phone. Here is what changes when the catalogue becomes a fast, searchable web experience.",
    date: "2025-03-18",
    readTime: "6 min read",
    category: "Catalogues",
    tags: ["Catalogue design", "B2B", "Performance"],
    cover: "/images/work-catalogue.jpg",
    coverAlt: "Open catalogue with tile samples on a dark table",
    sections: [
      {
        paragraphs: [
          "Industrial sales still runs on PDF catalogues attached to long email chains. Buyers open them on a phone, pinch, zoom, wait for pages to render — and often give up before finding the part number they came for.",
          "The fix is not a prettier PDF. It is treating the catalogue as a product: fast to open, easy to search and effortless to act on.",
        ],
      },
      {
        heading: "Speed is a sales feature",
        paragraphs: [
          "A flipbook that streams optimised page images loads the first spread in around a second on 4G. The buyer sees product immediately, not a progress bar. Every additional second of loading measurably lowers the chance someone reaches your best products.",
        ],
      },
      {
        heading: "Search beats scrolling",
        paragraphs: [
          "Once every SKU is data rather than pixels, buyers can search by part number, filter by size or material, and bookmark what they need. A 'send enquiry on WhatsApp' basket turns browsing into a qualified lead in two taps.",
          "The same source data can still generate a press-ready CMYK PDF with bleed marks for trade-show print runs — one source of truth, two outputs.",
        ],
      },
    ],
  },
  {
    slug: "choosing-boring-technology-for-business-software",
    title: "Choosing boring technology for business software (and why it wins)",
    excerpt:
      "React, Node, Express and a relational database will carry most businesses further than any trend. A practical guide to picking a stack you will not regret.",
    date: "2025-02-24",
    readTime: "5 min read",
    category: "Engineering",
    tags: ["Architecture", "React", "Node.js"],
    cover: "/images/work-saas.jpg",
    coverAlt: "Abstract network of glowing nodes",
    sections: [
      {
        paragraphs: [
          "Every year brings a new framework promising to fix everything. Meanwhile, a plant manager just needs inventory counts that are right when the shift changes.",
        ],
      },
      {
        heading: "Pick for the failure mode, not the feature list",
        paragraphs: [
          "Ask what happens when the network drops, when the database doubles, or when the developer who built it is unavailable. Mature tools have well-documented answers to all three — and a large hiring pool.",
        ],
      },
      {
        heading: "Our default stack",
        paragraphs: [
          "React or Next.js for the interface, Node and Express for APIs, PostgreSQL or MySQL for relational data and MongoDB when documents genuinely fit. PHP still earns its place for CMS-heavy projects and existing hosting.",
          "We reach for Three.js only where it earns its weight — product viewers, flipbooks and hero moments — and always with a static fallback.",
        ],
      },
    ],
  },
  {
    slug: "ai-product-imagery-for-exporters",
    title: "Replacing ₹5 lakh photoshoots with AI product imagery that stays on-brand",
    excerpt:
      "How fine-tuned image models and 3D reference passes produce trade-show-ready visuals in days, not weeks — and where human art direction still matters.",
    date: "2025-01-14",
    readTime: "7 min read",
    category: "Image generation",
    tags: ["AI", "Product imagery", "Manufacturing"],
    cover: "/images/work-render.jpg",
    coverAlt: "Metal turbine blade render with orange highlights",
    sections: [
      {
        paragraphs: [
          "Shipping a four-ton machine to a photo studio is expensive — and if the design changes two months later, the shoot is obsolete.",
        ],
      },
      {
        heading: "Reference first, generate second",
        paragraphs: [
          "We start from your CAD exports or a handful of real photographs, then fine-tune a model so geometry, finishes and logos stay accurate. The model is a tool; the art direction is still human.",
        ],
      },
      {
        heading: "Where it works best",
        paragraphs: [
          "Catalogue plates, marketplace listings, expo banners and social campaigns — anywhere you need many consistent images fast. For hero campaigns, we combine renders with real photography.",
        ],
      },
    ],
  },
  {
    slug: "technical-seo-checklist-for-b2b-websites",
    title: "A technical SEO checklist for B2B manufacturing websites",
    excerpt:
      "Most industrial sites lose enquiries to slow pages, missing schema and thin product pages. Fix these ten things first.",
    date: "2024-12-02",
    readTime: "8 min read",
    category: "SEO",
    tags: ["SEO", "Schema", "Core Web Vitals"],
    cover: "/images/work-web.jpg",
    coverAlt: "Brass industrial valves on a dark background",
    sections: [
      {
        paragraphs: [
          "Buyers searching for a specific valve, tile or component are ready to enquire. Your job is to be crawlable, fast and unambiguous.",
        ],
      },
      {
        heading: "The ten-minute wins",
        paragraphs: [
          "One H1 per page, unique titles and descriptions, canonical URLs, an XML sitemap, descriptive image alt text and compressed WebP or AVIF images. None of this is glamorous — all of it compounds.",
        ],
      },
      {
        heading: "Structured data",
        paragraphs: [
          "Add Organization, Product and BreadcrumbList schema so search engines understand what you sell. For large catalogues, generate pages programmatically from your product data with unique specs on every page.",
        ],
      },
    ],
  },
];

/* ───────────────────────── Pricing ───────────────────────── */

export interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  priceINR: number;
  priceUSD: number;
  advanceINR: number;
  advanceUSD: number;
  description: string;
  features: string[];
  delivery: string;
  featured?: boolean;
  /** primary key in pricing_tiers when loaded from the database */
  dbId?: number;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "sprint",
    name: "Precision Sprint",
    priceINR: 45000,
    priceUSD: 650,
    advanceINR: 15000,
    advanceUSD: 220,
    description: "A focused, high-converting site or landing system, shipped fast.",
    features: [
      "Up to 5 custom-designed pages",
      "Next.js + Tailwind, mobile-first",
      "Contact form with database logging",
      "Technical SEO and schema markup",
      "Lighthouse 90+ performance target",
      "14 days of post-launch support",
    ],
    delivery: "7 – 10 days",
  },
  {
    id: "engine",
    name: "One Target Engine",
    badge: "Most booked",
    priceINR: 120000,
    priceUSD: 1750,
    advanceINR: 35000,
    advanceUSD: 500,
    description: "A full custom platform: web app, 3D catalogue or business dashboard.",
    features: [
      "Up to 12 pages or a custom web application",
      "3D flipbook catalogue OR custom dashboard",
      "Admin panel for content and enquiries",
      "Razorpay / Stripe payments integrated",
      "WhatsApp enquiry funnel and analytics",
      "45 days of priority support",
    ],
    delivery: "3 – 4 weeks",
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise Architecture",
    badge: "Full power",
    priceINR: 240000,
    priceUSD: 3500,
    advanceINR: 60000,
    advanceUSD: 900,
    description: "SaaS, mobile app or ERP built for scale, with full source ownership.",
    features: [
      "SaaS / app / ERP architecture and build",
      "Multi-tenant data model and role-based access",
      "Subscription billing with webhooks",
      "CI/CD, monitoring and automated backups",
      "Full source code, docs and handover",
      "90 days of SLA-backed support",
    ],
    delivery: "6 – 8 weeks",
  },
];

export const FAQ = [
  { q: "How does the advance work?", a: "The advance locks your start date. It is deducted from the package price and the balance is split across agreed milestones — never all at the end." },
  { q: "Can I pay in USD or INR?", a: "Yes. Indian clients pay in INR; international clients can pay in USD through Razorpay's international checkout." },
  { q: "Who owns the code?", a: "You do. On final payment you receive the full source, deployment access and documentation." },
  { q: "Do you sign NDAs?", a: "Always — happy to sign yours before we discuss anything sensitive." },
  { q: "What if my project doesn't fit a package?", a: "Choose Custom. We'll scope it in a short call and agree a fixed price with milestones." },
];

/* ───────────────────────── Misc ───────────────────────── */

export const TESTIMONIALS = [
  {
    quote:
      "They replaced fourteen spreadsheets with one system our supervisors actually enjoy using. Quotes that took days now go out in minutes.",
    author: "Rajeshwar Singhania",
    role: "Managing Director",
    company: "Apex Engineering Works",
  },
  {
    quote:
      "The interactive catalogue brought us more export enquiries from one trade fair than the previous three combined. It simply looks and feels premium.",
    author: "Elena Rostova",
    role: "Global Export Lead",
    company: "Vedic Surfaces",
  },
  {
    quote:
      "From first call to paying customers in under four months. Clear scope, honest estimates and no surprises — exactly what a founder needs.",
    author: "Karthik Venkataraman",
    role: "Co-founder & CTO",
    company: "Velox Cloud",
  },
];

export const STATS = [
  { value: 20, suffix: "+", label: "Projects shipped" },
  { value: 3, suffix: "+ yrs", label: "Full-stack experience" },
  { value: 90, suffix: "%", label: "Typical uptime" },
  { value: 3.4, suffix: "×", label: "Average lead lift", decimals: 1 },
];

export const PROCESS = [
  { step: "01", title: "Calibrate", text: "A short call to understand the business target, constraints and what success looks like in numbers.", out: "Scope + fixed quote" },
  { step: "02", title: "Blueprint", text: "Wireframes, data model and a clickable prototype so you see the product before it is built.", out: "Approved prototype" },
  { step: "03", title: "Build", text: "Weekly demos on a live staging link. Clean, tested code — you can steer at every step.", out: "Working staging site" },
  { step: "04", title: "Launch", text: "Performance, security and SEO checks, deployment, training — then ongoing support.", out: "Live + handover docs" },
];

export const TECH = ["React", "Node.js", "Express", "MongoDB", "PHP", "MySQL", "PostgreSQL", "Three.js", "Tailwind CSS", "Next.js", "TypeScript", "GSAP"];

export const STACK_GRID = [
  { name: "React", note: "Interfaces & state", level: 95 },
  { name: "Node.js", note: "APIs & workers", level: 93 },
  { name: "Express", note: "REST services", level: 92 },
  { name: "MongoDB", note: "Document data", level: 86 },
  { name: "PHP", note: "CMS & legacy hosting", level: 82 },
  { name: "MySQL", note: "Relational data", level: 88 },
  { name: "Three.js", note: "3D & WebGL", level: 84 },
  { name: "Tailwind", note: "Design systems", level: 96 },
];

export const TIMELINE = [
  { year: "2018", title: "Foundations", text: "Backend engineering with PHP, MySQL and Node for regional logistics and trading firms." },
  { year: "2020", title: "Going full-stack", text: "Moved to React and Express, building dashboards and ordering portals for manufacturers." },
  { year: "2022", title: "SaaS & 3D", text: "Shipped subscription products and began using Three.js for product viewers and flipbooks." },
  { year: "2024", title: "Eklakshya Solutions", text: "Formed the studio around one idea — one target: precision, focus and measurable results." },
];

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export type Testimonial = (typeof TESTIMONIALS)[number];

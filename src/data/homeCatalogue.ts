import type { CatalogueItem } from "./siteData";

/** Original homepage illustration; independent of the uploaded catalogue showcase. */
export const HOME_CATALOGUE: CatalogueItem = {
  id: "apex-spares",
  title: "Heavy Spares",
  client: "Apex Engineering Works",
  industry: "Industrial machinery",
  year: "2025",
  blurb: "Hydraulic seals, gears, couplings and valves — searchable by SKU, drawing number or machine model.",
  plates: [
    { title: "Precision Machined Components", sub: "ISO 9001 certified manufacturing", image: "/images/work-erp.jpg", imageAlt: "Machining centre cutting metal with sparks", sku: 128, specs: ["Tolerances to ±0.005 mm", "Grade 8.8 high-tensile steel", "Export-grade rust-proof packing"] },
    { title: "Flanged Ball Valves", sub: "Class 150 – 2500 flow control", image: "/images/work-web.jpg", imageAlt: "Brass and steel valves", sku: 64, specs: ["1/2″ to 24″ NB", "WCB, CF8M and duplex bodies", "Fire-safe to API 607"] },
    { title: "Turbine & Impeller Parts", sub: "Dynamic-balanced rotating parts", image: "/images/work-render.jpg", imageAlt: "Metal turbine blade", sku: 41, specs: ["Vibration tested to ISO 1940", "Nickel-alloy options", "Traceable heat numbers"] },
    { title: "Field Service Kits", sub: "Ready-to-dispatch maintenance sets", image: "/images/work-app.jpg", imageAlt: "Phone next to machinery", sku: 36, specs: ["QR-linked service history", "Kitted per machine model", "48-hour dispatch"] },
  ],
};

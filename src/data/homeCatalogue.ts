import type { CatalogueItem } from "./siteData";

/** The homepage studio story stays independent of the dedicated PDF showcase. */
export const HOME_CATALOGUE: CatalogueItem = {
  id: "home-studio-story",
  title: "From idea to impact",
  client: "Eklakshya Solutions",
  industry: "Your goals. Our craft.",
  year: "2026",
  blurb: "We build websites, apps, business software and SaaS, alongside catalogues, product visuals and SEO. From your first brief to handover, we connect design and technology to the way your business works.",
  story: {
    coverLabel: "Our story",
    introLabel: "What we bring to your business",
    highlights: [
      { value: "7", label: "Connected services" },
      { value: "1", label: "Shared project plan" },
    ],
    chapterLabel: "Chapter",
    invitationLabel: "The next chapter is yours",
    invitationHeading: "Better outcomes. Clear timelines. Fair costs.",
    closingLine: "Built around your goals",
  },
  plates: [
    {
      title: "Understand the brief",
      sub: "Your needs become a practical plan",
      image: "/catalogues/sanway-2026/page-01.webp",
      imageAlt: "Sanway product catalogue cover from our catalogue work",
      sku: 0,
      caption: "Discover",
      specs: [
        "Start with your customers and business goals.",
        "Define deliverables, priorities and success.",
        "Agree the scope, milestones and budget.",
      ],
    },
    {
      title: "Bring the work to life",
      sub: "From a shared plan to tangible work",
      image: "/catalogues/house-of-sutram/page-01.webp",
      imageAlt: "House of Sutram premium gifting catalogue cover from our catalogue work",
      sku: 0,
      caption: "Create",
      specs: [
        "Explore our Sanway and House of Sutram work.",
        "Connect product stories, visuals and details.",
        "Carry that care into each digital project.",
      ],
    },
    {
      title: "Refine every detail",
      sub: "Clear communication. Focused execution.",
      image: "/catalogues/sanway-2026/page-10.webp",
      imageAlt: "Sanway catalogue page presenting juicers with product imagery and specifications",
      sku: 0,
      caption: "Optimise",
      specs: [
        "Review progress together at clear milestones.",
        "Test usability, performance and accuracy.",
        "Resolve feedback early to reduce rework.",
      ],
    },
    {
      title: "Deliver with confidence",
      sub: "A considered outcome, ready for use",
      image: "/catalogues/house-of-sutram/page-10.webp",
      imageAlt: "House of Sutram catalogue page presenting copperware gifting sets",
      sku: 0,
      caption: "Deliver",
      specs: [
        "Check the finished work against your brief.",
        "Prepare final assets and a clear handover.",
        "Aim for the best result within time and cost.",
      ],
    },
  ],
};

import type { CatalogueItem, CataloguePageAsset } from "@/data/siteData";

export type CataloguePageData =
  | ({ kind: "document" } & CataloguePageAsset)
  | { kind: "cover"; title: string; client: string; industry: string; year: string }
  | { kind: "intro"; title: string; blurb: string; client: string; skus: number }
  | { kind: "plate"; n: number; title: string; sub: string; image: string; alt: string; sku: number; specs: string[] }
  | { kind: "contact" }
  | { kind: "end"; client: string }
  | { kind: "blank" };

/** Original PDF pages stay in order; the studio's branded back cover is always last. */
export function buildCataloguePages(c: CatalogueItem): CataloguePageData[] {
  const pages: CataloguePageData[] = c.pages?.length
    ? c.pages.map((page) => ({ kind: "document", ...page }))
    : [
      { kind: "cover", title: c.title, client: c.client, industry: c.industry, year: c.year },
      { kind: "intro", title: c.title, blurb: c.blurb, client: c.client, skus: c.plates.reduce((a, p) => a + p.sku, 0) },
      ...c.plates.map((p, i) => ({ kind: "plate" as const, n: i + 1, title: p.title, sub: p.sub, image: p.image, alt: p.imageAlt, sku: p.sku, specs: p.specs })),
      { kind: "contact" },
    ];
  pages.push({ kind: "end", client: c.client });
  // Every physical leaf needs two faces. Put any padding inside the back cover.
  if (pages.length % 2 === 1) pages.splice(pages.length - 1, 0, { kind: "blank" });
  return pages;
}

export function cataloguePageCount(c: CatalogueItem) {
  const count = c.pages?.length ? c.pages.length + 1 : c.plates.length + 4;
  return count + count % 2;
}

import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { BLOG_POSTS, PROJECTS } from "@/data/siteData";

const BUILD_DATE = new Date("2025-04-01");

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/services", "/portfolio", "/catalogues", "/about", "/pricing", "/blog", "/contact"].map((p) => ({
    url: `${SITE.url}${p}`,
    lastModified: BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  const projects = PROJECTS.map((p) => ({ url: `${SITE.url}/portfolio/${p.slug}`, lastModified: BUILD_DATE, changeFrequency: "yearly" as const, priority: 0.7 }));
  const posts = BLOG_POSTS.map((p) => ({ url: `${SITE.url}/blog/${p.slug}`, lastModified: new Date(p.date), changeFrequency: "yearly" as const, priority: 0.6 }));
  return [...pages, ...projects, ...posts];
}

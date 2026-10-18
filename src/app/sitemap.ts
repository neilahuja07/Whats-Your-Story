import type { MetadataRoute } from "next";
import { init } from "@/lib/bootstrap";
import { SITE_URL } from "@/lib/site";
import { getPublishedSlugs } from "@/lib/repositories/stories";

/**
 * Sitemap — public pages plus every PUBLISHED story.
 *
 * Only published stories are included; drafts and submissions are never
 * exposed. Sample stories are included (they are public) but are clearly
 * badged as samples on the site itself.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  init();

  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/stories`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/founder`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/share`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const stories: MetadataRoute.Sitemap = (await getPublishedSlugs()).map((s) => ({
    url: `${SITE_URL}/stories/${s.slug}`,
    lastModified: s.updatedAt ? new Date(s.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticPages, ...stories];
}

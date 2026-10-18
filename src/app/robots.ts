import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots — allow the public site, disallow the admin panel.
 *
 * The admin area is already protected by authentication, but it is also kept
 * out of search indexes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

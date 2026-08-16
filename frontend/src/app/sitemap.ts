import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// /nope/[id] result pages are intentionally excluded and marked noindex
// (see generateMetadata in that route) - they're unmoderated user-submitted
// text, not evergreen content worth indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/nopes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}

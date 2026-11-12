import { getCollection } from "astro:content";
import { SITE_URL, isoDate, guideHref } from "../lib/seo.js";
import { RULES } from "../data/rules.js";

// One entry per public page. Guide pages use their "last checked" date.
export async function GET() {
  const guide = await getCollection("guide");
  const rulesDay = isoDate(RULES.lastReviewed);
  const urls = [
    { loc: "/", lastmod: rulesDay },
    { loc: "/about/", lastmod: rulesDay },
    ...guide.map((p) => ({ loc: guideHref(p.id), lastmod: isoDate(p.data.lastChecked) }))
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE_URL}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

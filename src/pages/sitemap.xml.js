import { getCollection } from "astro:content";
import { SITE_URL, isoDate } from "../lib/seo.js";
import { parseGuideId, guidePath, publishedLocales } from "../i18n/index.js";
import { localizePath } from "../i18n/locales.js";
import { RULES } from "../data/rules.js";
import { LEGAL_UPDATED } from "../data/site.js";
import { CORRECTIONS } from "../data/corrections.js";

// One entry per public page. Guide pages use their "last checked" date.
export async function GET() {
  const live = await publishedLocales();
  const guide = (await getCollection("guide")).filter((p) => live.includes(parseGuideId(p.id).lang));
  const rulesDay = isoDate(RULES.lastReviewed);
  const urls = [
    ...live.map((lang) => ({ loc: localizePath(lang, "/"), lastmod: rulesDay })),
    ...live.map((lang) => ({ loc: localizePath(lang, "/rates/"), lastmod: rulesDay })),
    { loc: "/about/", lastmod: rulesDay },
    { loc: "/terms/", lastmod: isoDate(LEGAL_UPDATED) },
    { loc: "/privacy/", lastmod: isoDate(LEGAL_UPDATED) },
    { loc: "/corrections/", lastmod: isoDate(CORRECTIONS[0]?.date ?? LEGAL_UPDATED) },
    ...guide.map((p) => { const { lang, section, slug } = parseGuideId(p.id); return { loc: guidePath(lang, slug, section), lastmod: isoDate(p.data.lastChecked) }; })
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE_URL}${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

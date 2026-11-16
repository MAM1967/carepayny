import { getCollection } from "astro:content";
import { SITE_URL, isoDate } from "../lib/seo.js";
import { parseGuideId, guidePath, publishedLocales } from "../i18n/index.js";
import { localizePath } from "../i18n/locales.js";
import { RULES } from "../data/rules.js";
import { LEGAL_UPDATED, EMAIL_SIGNUP_OPEN } from "../data/site.js";
import { CORRECTIONS } from "../data/corrections.js";
import TRAINING_LIST from "../data/training-programs.js";
// Keep in step with LAST_CHECKED in src/pages/training/programs.astro.
const TRAINING_CHECKED = "November 16, 2026";

// One entry per public page. Guide pages use their "last checked" date.
export async function GET() {
  const live = await publishedLocales();
  const guide = (await getCollection("guide")).filter((p) => live.includes(parseGuideId(p.id).lang));
  const rulesDay = isoDate(RULES.lastReviewed);
  const urls = [
    ...live.map((lang) => ({ loc: localizePath(lang, "/"), lastmod: rulesDay })),
    ...live.map((lang) => ({ loc: localizePath(lang, "/rates/"), lastmod: rulesDay })),
    // The sign-up page, only once sign-up is open. Its check/confirm/done steps are never listed.
    ...(EMAIL_SIGNUP_OPEN ? live.map((lang) => ({ loc: localizePath(lang, "/updates/"), lastmod: isoDate(LEGAL_UPDATED) })) : []),
    { loc: "/about/", lastmod: rulesDay },
    { loc: "/terms/", lastmod: isoDate(LEGAL_UPDATED) },
    { loc: "/privacy/", lastmod: isoDate(LEGAL_UPDATED) },
    { loc: "/training/programs/", lastmod: TRAINING_LIST.reportDate > isoDate(TRAINING_CHECKED) ? TRAINING_LIST.reportDate : isoDate(TRAINING_CHECKED) },
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

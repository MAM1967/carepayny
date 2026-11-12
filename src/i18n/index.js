// Build-time i18n helpers for .astro files.
import { getCollection } from "astro:content";
import { LOCALES, DEFAULT_LOCALE, localizePath } from "./locales.js";
import { makeT, localDate } from "./format.js";

const files = import.meta.glob("./ui/*.json", { eager: true, import: "default" });
export const UI = Object.fromEntries(
  Object.entries(files).map(([path, dict]) => [path.match(/ui\/(\w+)\.json$/)[1], dict])
);

export const t = (lang) => makeT(UI[lang] ?? {}, lang === DEFAULT_LOCALE ? {} : UI[DEFAULT_LOCALE]);
export const dateFor = (lang, englishDate) => localDate(englishDate, LOCALES[lang].intl);

// Guide collection ids look like "es/cdpap/not-paid/missing-i9".
export function parseGuideId(id) {
  const [lang, , ...rest] = id.split("/");
  const slug = rest.join("/") || "index";
  return { lang, slug };
}
export const guidePath = (lang, slug) =>
  localizePath(lang, slug === "index" ? "/cdpap/" : `/cdpap/${slug.replace(/\/index$/, "")}/`);

// A language goes live only when it is complete: every UI string and every
// English guide page has a translation. No half-translated sites (PRD).
let cache;
export async function publishedLocales() {
  if (cache) return cache;
  const pages = await getCollection("guide");
  const slugs = (lang) => new Set(pages.map((p) => parseGuideId(p.id)).filter((p) => p.lang === lang).map((p) => p.slug));
  const enSlugs = slugs(DEFAULT_LOCALE);
  const enKeys = Object.keys(UI[DEFAULT_LOCALE]).filter((k) => !k.startsWith("_"));
  cache = Object.keys(LOCALES).filter((lang) => {
    if (lang === DEFAULT_LOCALE) return true;
    const dict = UI[lang];
    if (!dict || enKeys.some((k) => !(k in dict))) return false;
    const have = slugs(lang);
    return [...enSlugs].every((s) => have.has(s));
  });
  return cache;
}

// Versions of the same page in every live language, for hreflang and the switcher.
export async function alternatesFor(pathWithoutLocale) {
  const live = await publishedLocales();
  return live.map((lang) => ({ lang, href: localizePath(lang, pathWithoutLocale) }));
}

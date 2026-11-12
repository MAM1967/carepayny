// The site's languages: English plus 3, and no more (docs/PRD.md, "Translation plan").
export const DEFAULT_LOCALE = "en";
export const LOCALES = {
  en: { name: "English",  htmlLang: "en",      hreflang: "en",      og: "en_US", intl: "en-US" },
  es: { name: "Español",  htmlLang: "es",      hreflang: "es",      og: "es_US", intl: "es-US" },
  zh: { name: "中文",      htmlLang: "zh-Hans", hreflang: "zh-Hans", og: "zh_CN", intl: "zh-Hans-US" },
  ru: { name: "Русский",  htmlLang: "ru",      hreflang: "ru",      og: "ru_RU", intl: "ru-RU" }
};
export const LOCALE_CODES = Object.keys(LOCALES);

// "/es/cdpap/x/" -> "/cdpap/x/" ; "/" stays "/"
export function stripLocale(path) {
  const m = /^\/(es|zh|ru)(\/|$)/.exec(path);
  return m ? path.slice(m[1].length + 1) || "/" : path;
}
// ("es", "/cdpap/x/") -> "/es/cdpap/x/"
export function localizePath(lang, path) {
  return lang === DEFAULT_LOCALE ? path : `/${lang}${path}`;
}

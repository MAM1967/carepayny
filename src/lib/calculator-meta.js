import { RULES } from "../data/rules.js";
import { SITE_URL } from "./seo.js";
import { t } from "../i18n/index.js";
import { LOCALES, localizePath } from "../i18n/locales.js";

export function calculatorMeta(lang) {
  const tr = t(lang);
  const url = `${SITE_URL}${localizePath(lang, "/")}`;
  return {
    title: tr("meta.calc.title"),
    description: tr("meta.calc.description", { year: RULES.effective.slice(-4) }),
    jsonLd: [{
      "@type": "WebApplication",
      "@id": `${url}#calculator`,
      name: "CarePayNY pay check",
      url,
      description: tr("meta.calc.appDescription"),
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any (runs in a web browser)",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      inLanguage: LOCALES[lang].hreflang,
      publisher: { "@id": `${SITE_URL}/#org` }
    }]
  };
}

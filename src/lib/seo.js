// Shared facts for search engines and AI answer tools (structured data, sitemap, llms.txt).
export const SITE_URL = "https://carepayny.com";
export const SITE_NAME = "CarePayNY";

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

// "November 11, 2026" -> "2026-11-11"
export function isoDate(text) {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(text.trim());
  if (!m) throw new Error(`Can't read date "${text}". Use the form "November 11, 2026".`);
  const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
  if (!month) throw new Error(`Unknown month in "${text}"`);
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

export const ORGANIZATION = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#org`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/favicon.svg`,
  email: "hello@carepayny.com",
  description: "Free, independent website that explains New York's home care pay rules and the CDPAP program in plain English."
};

export const WEBSITE = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: "en-US",
  publisher: { "@id": `${SITE_URL}/#org` }
};

export const guideHref = (id) => (id === "index" ? "/cdpap/" : `/cdpap/${id.replace(/\/index$/, "")}/`);

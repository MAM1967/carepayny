// Pay figures used in guide pages. Pages write {{token}} instead of a number,
// so every rate comes from src/data/rules.js (CLAUDE.md rule 2) and translators
// never retype a number. An unknown token stops the build.
import { RULES, RULES_BY_YEAR } from "../data/rules.js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const money = (n) => "$" + n.toFixed(2);
const NOT_POSTED = "not posted";
const reg = RULES.regions;

export const TOKENS = {
  "rules.effective": RULES.effective,
  "rules.version": RULES.version,
  "ppl.effective": RULES.ppl.effective,
  "ppl.nyc": money(reg.nyc.pplBase),
  "ppl.liw": money(reg.liw.pplBase),
  "ppl.rest": money(reg.rest.pplBase),
  "min.nyc": money(reg.nyc.hcaMin),
  "min.liw": money(reg.liw.hcaMin),
  "min.rest": money(reg.rest.hcaMin),
  "wp.nyc.benefit": money(reg.nyc.wpBenefit),
  "wp.nyc.total": money(reg.nyc.wpTotal),
  "wp.liw.benefit": money(reg.liw.wpBenefit),
  "wp.liw.total": money(reg.liw.wpTotal),
  "ot.hours": String(RULES.overtime.standard),
  "ot.times": RULES.overtime.multiplier === 1.5 ? "time and a half (1.5 times your rate)" : `${RULES.overtime.multiplier} times your rate`,
  "livein.hours": String(RULES.liveIn.paidHours)
};

// Year-specific figures, e.g. {{2027.min.nyc}}, for pages that show more than one year.
const show = (n) => (n == null ? NOT_POSTED : money(n));
for (const [year, R] of Object.entries(RULES_BY_YEAR)) {
  for (const [key, reg] of Object.entries(R.regions)) {
    TOKENS[`${year}.min.${key}`] = show(reg.hcaMin);
    TOKENS[`${year}.ppl.${key}`] = show(reg.pplBase);
    if (reg.wpTotal != null) {
      TOKENS[`${year}.wp.${key}.benefit`] = money(reg.wpBenefit);
      TOKENS[`${year}.wp.${key}.total`] = money(reg.wpTotal);
    }
  }
  TOKENS[`${year}.general.nyc`] = money(R.regions.nyc.generalMin);
  TOKENS[`${year}.general.rest`] = money(R.regions.rest.generalMin);
}

// A few tokens are words, not numbers; they come from the page's language file.
const uiDir = fileURLToPath(new URL("../i18n/ui/", import.meta.url));
const uiCache = {};
function ui(lang) {
  if (!(lang in uiCache)) {
    const f = `${uiDir}${lang}.json`;
    uiCache[lang] = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
  }
  return uiCache[lang];
}
const WORD_TOKENS = { "ot.times": "token.ot.times" };

export function langOfFile(path = "") {
  const m = /[\\/]content[\\/](en|es|zh|ru)[\\/]/.exec(path);
  return m ? m[1] : "en";
}

export function fillTokens(text, file = "") {
  const lang = langOfFile(file);
  const words = { ...ui("en"), ...ui(lang) };
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    if (!(key in TOKENS)) throw new Error(`Unknown token {{${key}}}${file ? ` in ${file}` : ""}`);
    if (key in WORD_TOKENS) return words[WORD_TOKENS[key]] ?? TOKENS[key];
    if (TOKENS[key] === NOT_POSTED) return words["token.notPosted"] ?? NOT_POSTED;
    return TOKENS[key];
  });
}

// Remark plugin: replaces tokens in text, link text and table cells. In translated
// pages it also points links between our own pages (/ and /cdpap/…) to the same language.
export function remarkTokens() {
  return (tree, file) => {
    const lang = langOfFile(file?.path);
    const walk = (node) => {
      if ((node.type === "text" || node.type === "inlineCode") && typeof node.value === "string") {
        node.value = fillTokens(node.value, file?.path);
      }
      if (lang !== "en" && node.type === "link" && typeof node.url === "string" && (node.url === "/" || node.url.startsWith("/cdpap"))) {
        node.url = `/${lang}${node.url}`;
      }
      if (node.children) node.children.forEach(walk);
    };
    walk(tree);
  };
}

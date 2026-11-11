// Pay figures used in guide pages. Pages write {{token}} instead of a number,
// so every rate comes from src/data/rules.js (CLAUDE.md rule 2) and translators
// never retype a number. An unknown token stops the build.
import { RULES } from "../data/rules.js";

const money = (n) => "$" + n.toFixed(2);
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

export function fillTokens(text, file = "") {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    if (!(key in TOKENS)) throw new Error(`Unknown token {{${key}}}${file ? ` in ${file}` : ""}`);
    return TOKENS[key];
  });
}

// Remark plugin: replaces tokens in text, link text and table cells.
export function remarkTokens() {
  return (tree, file) => {
    const walk = (node) => {
      if ((node.type === "text" || node.type === "inlineCode") && typeof node.value === "string") {
        node.value = fillTokens(node.value, file?.path);
      }
      if (node.children) node.children.forEach(walk);
    };
    walk(tree);
  };
}

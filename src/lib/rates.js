// The NY home care pay rates table (/rates/) and its CSV (/rates.csv).
// Every value and every source link is READ from src/data/rules.js; nothing here is a rate.
// This file only says which rules.js field goes in which row, and which rules.js source backs it.
import { RULESETS } from "../data/rules.js";
import { isoDate, SITE_URL } from "./seo.js";

export const REGIONS = ["nyc", "liw", "rest"];

// All sources listed in rules.js, by URL.
const ALL_SOURCES = new Map();
for (const R of RULESETS) for (const s of R.sources) if (!ALL_SOURCES.has(s.url)) ALL_SOURCES.set(s.url, s);
const src = (url) => {
  const s = ALL_SOURCES.get(url);
  if (!s) throw new Error(`rates.js: ${url} is not a source in src/data/rules.js`);
  return s;
};

const PHL_3614F = "https://www.nysenate.gov/legislation/laws/PBH/3614-F";
const DOL_HCA_MIN = "https://dol.ny.gov/minimum-wage-home-care-aides-fare-grant";
const DOL_WAGE_PARITY = "https://dol.ny.gov/home-health-care-aides-and-wage-parity";
const DOH_WAGE_PARITY = "https://www.health.ny.gov/health_care/medicaid/redesign/mrt_61.htm";
const GOV_2027 = "https://governor.ny.gov/new-york-state-minimum-wage-2027";
const PPL_FAQ = "https://pplfirst.com/new-york-cdpap-frequently-asked-questions/";

// One row group per rate type. `sources(year)` lists rules.js source URLs, first = primary (used in the CSV).
export const RATE_TYPES = [
  { id: "home_care_aide_minimum", field: "hcaMin", key: "rates.row.hcaMin",
    sources: (y) => (y >= 2027 ? [GOV_2027] : [PHL_3614F, DOL_HCA_MIN]) },
  // The 2027 notice says the general minimum "will stay the same" as in 2026.
  { id: "general_minimum_wage", field: "generalMin", key: "rates.row.generalMin",
    sources: () => [GOV_2027] },
  // The DOH table sets the benefit portion "for all periods on or after January 1, 2024".
  { id: "wage_parity_benefit", field: "wpBenefit", key: "rates.row.wpBenefit",
    sources: () => [DOH_WAGE_PARITY, DOL_WAGE_PARITY] },
  { id: "wage_parity_total_compensation", field: "wpTotal", key: "rates.row.wpTotal",
    sources: () => [DOL_WAGE_PARITY, DOH_WAGE_PARITY] },
  { id: "ppl_cdpap_base_pay", field: "pplBase", key: "rates.row.pplBase", ppl: true,
    sources: () => [PPL_FAQ] }
];

// Rows for the table: one per rate type and year, with a value (or null) per region.
export function rateRows() {
  const rows = [];
  for (const type of RATE_TYPES) {
    for (const R of RULESETS) {
      const year = Number(R.startsOn.slice(0, 4));
      rows.push({
        type,
        year,
        effective: type.ppl ? R.ppl.effective : R.effective,
        note: type.ppl ? R.ppl.note : undefined,
        values: Object.fromEntries(REGIONS.map((k) => [k, R.regions[k][type.field] ?? null])),
        sources: type.sources(year).map(src)
      });
    }
  }
  return rows;
}

export const YEARS = RULESETS.map((R) => Number(R.startsOn.slice(0, 4)));
export const regionLabel = (k) => RULESETS[0].regions[k].label;
export const lastReviewed = () => RULESETS.map((R) => R.lastReviewed).sort((a, b) => isoDate(a).localeCompare(isoDate(b))).at(-1);
export const money = (n) => "$" + n.toFixed(2);
export const CSV_PATH = "/rates.csv";
export const CSV_URL = `${SITE_URL}${CSV_PATH}`;

// CSV: one line per year, region and rate that has a value. Rates that are not posted
// (null) or do not apply (wage parity outside downstate) are left out.
export function ratesCsv() {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = [["year", "region", "rate_type", "value_usd", "effective_date", "source_url"]];
  for (const row of rateRows()) {
    for (const k of REGIONS) {
      const v = row.values[k];
      if (v == null) continue;
      lines.push([row.year, regionLabel(k), row.type.id, v.toFixed(2), isoDate(row.effective), row.sources[0].url]);
    }
  }
  return lines.map((l) => l.map(esc).join(",")).join("\n") + "\n";
}

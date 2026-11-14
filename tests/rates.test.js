// The rates table and CSV must match src/data/rules.js exactly, and cite only rules.js sources.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULESETS } from "../src/data/rules.js";
import { rateRows, ratesCsv, REGIONS } from "../src/lib/rates.js";

const ruleUrls = new Set(RULESETS.flatMap((R) => R.sources.map((s) => s.url)));

test("every table value comes from rules.js", () => {
  for (const row of rateRows()) {
    const R = RULESETS.find((r) => r.startsOn.startsWith(String(row.year)));
    for (const k of REGIONS) assert.equal(row.values[k], R.regions[k][row.type.field] ?? null, `${row.type.id} ${row.year} ${k}`);
    assert.ok(row.sources.length > 0);
    for (const s of row.sources) assert.ok(ruleUrls.has(s.url), `${s.url} not in rules.js`);
  }
});

test("CSV has the right columns and one line per posted value", () => {
  const lines = ratesCsv().trim().split("\n");
  assert.equal(lines[0], "year,region,rate_type,value_usd,effective_date,source_url");
  const posted = rateRows().reduce((n, r) => n + REGIONS.filter((k) => r.values[k] != null).length, 0);
  assert.equal(lines.length - 1, posted);
  assert.ok(lines.some((l) => l.startsWith("2027,New York City (5 boroughs),home_care_aide_minimum,20.00,2027-01-01,")));
  assert.ok(!lines.some((l) => /,,/.test(l)), "no empty fields");
});

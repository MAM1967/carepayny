// Worked examples for the pay calculator.
// Every rules change must keep these passing. When rates change, update the
// expected numbers here AND have the owner confirm them before merging.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWeek } from "../src/lib/calc.js";
import { RULES_BY_YEAR, rulesFor } from "../src/data/rules.js";

// Pin each example to its year so tests don't change meaning on January 1.
const R26 = RULES_BY_YEAR[2026];
const R27 = RULES_BY_YEAR[2027];

const r2 = (n) => Math.round(n * 100) / 100;

test("rules: wage parity totals equal base minimum plus benefit, every year", () => {
  for (const [year, R] of Object.entries(RULES_BY_YEAR)) {
    for (const [key, reg] of Object.entries(R.regions)) {
      if (reg.wpTotal == null) continue;
      assert.equal(r2(reg.hcaMin + reg.wpBenefit), reg.wpTotal, `${year} region ${key}`);
    }
  }
});

test("NYC agency, Medicaid, $20/hr, 40 hours: legal rate, owes wage parity benefits", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 20, regularHours: 40 }, R26);
  assert.equal(r.minRate, 19.65);
  assert.equal(r.expectedGross, 800);
  assert.equal(r.wp.gapPerHour, 2.19);
  assert.equal(r.wp.gapWeek, 87.6);
  assert.equal(r.status, "check");
});

test("rate below the home care aide minimum is flagged", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 18, regularHours: 30 }, R26);
  assert.equal(r.rateShort, 1.65);
  assert.equal(r.status, "bad");
  assert.equal(r.expectedGross, r.legalFloorGross);
});

test("overtime after 40 hours at 1.5x; rate above wage parity total is covered in cash", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 23, regularHours: 50 }, R26);
  assert.equal(r.otHours, 10);
  assert.equal(r.expectedGross, 40 * 23 + 10 * 34.5);
  assert.ok(r.wp.coveredInCash);
  assert.equal(r.status, "ok");
});

test("three 24-hour shifts with all breaks count as 39 paid hours", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 23, shifts24: 3 }, R26);
  assert.equal(r.liveInHours, 39);
  assert.equal(r.otHours, 0);
});

test("missed sleep on two of four 24-hour shifts adds 8 hours each", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 23, shifts24: 4, sleepMissed: 2 }, R26);
  assert.equal(r.liveInHours, 68);
  assert.equal(r.otHours, 28);
  assert.equal(r.expectedGross, r2(40 * 23 + 28 * 34.5));
  assert.equal(r.status, "check");
});

test("missed meals add 3 hours per shift; missed counts are capped at the shift count", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 23, shifts24: 1, mealsMissed: 5 }, R26);
  assert.equal(r.liveInHours, 16);
});

test("CDPAP on Long Island is Medicaid work with the $21.32 wage parity total", () => {
  const r = computeWeek({ region: "liw", employer: "cdpap", rate: 20, regularHours: 20 }, R26);
  assert.equal(r.minRate, 19.65);
  assert.equal(r.wp.applies, "yes");
  // Expected pay uses PPL's $20.05 base, so the wage parity gap is 21.32 - 20.05.
  assert.equal(r.wp.gapPerHour, 1.27);
});

test("CDPAP in NYC at the state minimum is legal but $1.00 under PPL's $20.65 base", () => {
  const r = computeWeek({ region: "nyc", employer: "cdpap", rate: 19.65, regularHours: 40 }, R26);
  assert.equal(r.rateShort, 0);
  assert.equal(r.pplRate, 20.65);
  assert.equal(r.pplShort, 1);
  assert.equal(r.expectedGross, 826);   // 40 x 20.65
  assert.equal(r.legalFloorGross, 786); // 40 x 19.65
  assert.equal(r.status, "check");
});

test("CDPAP in NYC paid PPL's base: no PPL flag; overtime at 1.5x of $20.65", () => {
  const r = computeWeek({ region: "nyc", employer: "cdpap", rate: 20.65, regularHours: 45 }, R26);
  assert.equal(r.pplShort, 0);
  assert.ok(!r.flags.some((f) => f.text.includes("PPL says")));
  assert.equal(r.expectedGross, r2(40 * 20.65 + 5 * 20.65 * 1.5));
});

test("CDPAP upstate: PPL base equals the $18.65 state minimum", () => {
  const r = computeWeek({ region: "rest", employer: "cdpap", rate: 18.65, regularHours: 30 }, R26);
  assert.equal(r.pplRate, 18.65);
  assert.equal(r.pplShort, 0);
  assert.equal(r.status, "ok");
});

test("agency work never uses the PPL rate", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 19.65, regularHours: 10 }, R26);
  assert.equal(r.pplRate, null);
});

test("upstate agency work: $18.65 minimum and no wage parity", () => {
  const r = computeWeek({ region: "rest", employer: "agency", medicaid: "yes", rate: 19, regularHours: 40 }, R26);
  assert.equal(r.minRate, 18.65);
  assert.equal(r.wp, null);
  assert.equal(r.status, "ok");
});

test("direct hire who lives in: general minimum and 44-hour overtime threshold", () => {
  const r = computeWeek({ region: "nyc", employer: "private", livesIn: true, rate: 18, regularHours: 50 }, R26);
  assert.equal(r.minRate, 17);
  assert.equal(r.threshold, 44);
  assert.equal(r.otHours, 6);
  assert.equal(r.wp, null);
});

test("agency live-in aide still gets overtime after 40 hours", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", livesIn: true, rate: 23, regularHours: 44 }, R26);
  assert.equal(r.threshold, 40);
  assert.equal(r.otHours, 4);
});

test("pay stub more than $1 short is flagged", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "no", rate: 20, regularHours: 40, stubGross: 700 }, R26);
  assert.equal(r.stub.diff, 100);
  assert.equal(r.status, "bad");
  assert.equal(r.wp, null);
});

test("pay stub within $1 is not flagged", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "no", rate: 20, regularHours: 40, stubGross: 799.5 }, R26);
  assert.equal(r.status, "ok");
});

test("Medicaid unsure with a rate above the wage parity total is fine", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "unsure", rate: 25, regularHours: 40 }, R26);
  assert.equal(r.wp.applies, "maybe");
  assert.equal(r.status, "ok");
});

test("unknown region throws instead of guessing", () => {
  assert.throws(() => computeWeek({ region: "nj", employer: "agency", rate: 20 }, R26));
});

// ---- 2027 rules (in effect from January 1, 2027) ----

test("rulesFor switches from 2026 to 2027 on January 1 (local date)", () => {
  assert.equal(rulesFor(new Date(2026, 11, 31, 23, 59)).version, R26.version);
  assert.equal(rulesFor(new Date(2027, 0, 1, 0, 1)).version, R27.version);
});

test("2027: home care minimum $20.00 downstate, $19.00 upstate; general minimum unchanged", () => {
  assert.equal(R27.regions.nyc.hcaMin, 20);
  assert.equal(R27.regions.liw.hcaMin, 20);
  assert.equal(R27.regions.rest.hcaMin, 19);
  assert.equal(R27.regions.nyc.generalMin, 17);
  assert.equal(R27.regions.rest.generalMin, 16);
});

test("2027 NYC agency at $19.65 (last year's minimum) is now $0.35 short", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 19.65, regularHours: 40 }, R27);
  assert.equal(r.rateShort, 0.35);
  assert.equal(r.status, "bad");
  assert.equal(r.legalFloorGross, 800); // 40 x 20.00
});

test("2027 NYC wage parity total is $22.54 (20.00 + 2.54)", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 20, regularHours: 10 }, R27);
  assert.equal(r.wp.total, 22.54);
  assert.equal(r.wp.gapPerHour, 2.54);
});

test("2027 Long Island CDPAP: PPL's posted $20.05 still above the $20.00 minimum", () => {
  const r = computeWeek({ region: "liw", employer: "cdpap", rate: 20, regularHours: 20 }, R27);
  assert.equal(r.pplRate, 20.05);
  assert.equal(r.pplShort, 0.05);
  assert.equal(r.wp.total, 21.67);
});

test("2027 upstate CDPAP: no PPL rate shown (old $18.65 is below the $19.00 minimum)", () => {
  const r = computeWeek({ region: "rest", employer: "cdpap", rate: 18.65, regularHours: 30 }, R27);
  assert.equal(r.pplRate, null);
  assert.equal(r.minRate, 19);
  assert.equal(r.rateShort, 0.35);
  assert.equal(r.status, "bad");
});

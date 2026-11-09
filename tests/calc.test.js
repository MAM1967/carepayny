// Worked examples for the pay calculator.
// Every rules change must keep these passing. When rates change, update the
// expected numbers here AND have the owner confirm them before merging.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWeek } from "../src/lib/calc.js";
import { RULES } from "../src/data/rules.js";

const r2 = (n) => Math.round(n * 100) / 100;

test("rules: wage parity totals equal base minimum plus benefit", () => {
  for (const [key, reg] of Object.entries(RULES.regions)) {
    if (reg.wpTotal == null) continue;
    assert.equal(r2(reg.hcaMin + reg.wpBenefit), reg.wpTotal, `region ${key}`);
  }
});

test("NYC agency, Medicaid, $20/hr, 40 hours: legal rate, owes wage parity benefits", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 20, regularHours: 40 });
  assert.equal(r.minRate, 19.65);
  assert.equal(r.expectedGross, 800);
  assert.equal(r.wp.gapPerHour, 2.19);
  assert.equal(r.wp.gapWeek, 87.6);
  assert.equal(r.status, "check");
});

test("rate below the home care aide minimum is flagged", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 18, regularHours: 30 });
  assert.equal(r.rateShort, 1.65);
  assert.equal(r.status, "bad");
  assert.equal(r.expectedGross, r.legalFloorGross);
});

test("overtime after 40 hours at 1.5x; rate above wage parity total is covered in cash", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 23, regularHours: 50 });
  assert.equal(r.otHours, 10);
  assert.equal(r.expectedGross, 40 * 23 + 10 * 34.5);
  assert.ok(r.wp.coveredInCash);
  assert.equal(r.status, "ok");
});

test("three 24-hour shifts with all breaks count as 39 paid hours", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 23, shifts24: 3 });
  assert.equal(r.liveInHours, 39);
  assert.equal(r.otHours, 0);
});

test("missed sleep on two of four 24-hour shifts adds 8 hours each", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 23, shifts24: 4, sleepMissed: 2 });
  assert.equal(r.liveInHours, 68);
  assert.equal(r.otHours, 28);
  assert.equal(r.expectedGross, r2(40 * 23 + 28 * 34.5));
  assert.equal(r.status, "check");
});

test("missed meals add 3 hours per shift; missed counts are capped at the shift count", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", rate: 23, shifts24: 1, mealsMissed: 5 });
  assert.equal(r.liveInHours, 16);
});

test("CDPAP on Long Island is Medicaid work with the $21.32 wage parity total", () => {
  const r = computeWeek({ region: "liw", employer: "cdpap", rate: 20, regularHours: 20 });
  assert.equal(r.minRate, 19.65);
  assert.equal(r.wp.applies, "yes");
  assert.equal(r.wp.gapPerHour, 1.32);
});

test("upstate agency work: $18.65 minimum and no wage parity", () => {
  const r = computeWeek({ region: "rest", employer: "agency", medicaid: "yes", rate: 19, regularHours: 40 });
  assert.equal(r.minRate, 18.65);
  assert.equal(r.wp, null);
  assert.equal(r.status, "ok");
});

test("direct hire who lives in: general minimum and 44-hour overtime threshold", () => {
  const r = computeWeek({ region: "nyc", employer: "private", livesIn: true, rate: 18, regularHours: 50 });
  assert.equal(r.minRate, 17);
  assert.equal(r.threshold, 44);
  assert.equal(r.otHours, 6);
  assert.equal(r.wp, null);
});

test("agency live-in aide still gets overtime after 40 hours", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "yes", livesIn: true, rate: 23, regularHours: 44 });
  assert.equal(r.threshold, 40);
  assert.equal(r.otHours, 4);
});

test("pay stub more than $1 short is flagged", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "no", rate: 20, regularHours: 40, stubGross: 700 });
  assert.equal(r.stub.diff, 100);
  assert.equal(r.status, "bad");
  assert.equal(r.wp, null);
});

test("pay stub within $1 is not flagged", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "no", rate: 20, regularHours: 40, stubGross: 799.5 });
  assert.equal(r.status, "ok");
});

test("Medicaid unsure with a rate above the wage parity total is fine", () => {
  const r = computeWeek({ region: "nyc", employer: "agency", medicaid: "unsure", rate: 25, regularHours: 40 });
  assert.equal(r.wp.applies, "maybe");
  assert.equal(r.status, "ok");
});

test("unknown region throws instead of guessing", () => {
  assert.throws(() => computeWeek({ region: "nj", employer: "agency", rate: 20 }));
});

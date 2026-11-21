// Anonymous events must carry coarse categories only, never the numbers a person types.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeWeek } from "../src/lib/calc.js";
import { RULES_BY_YEAR } from "../src/data/rules.js";
import { sanitize, calcEvent, SCHEMA, hoursBand, gapBand, stubBand } from "../src/lib/events.js";
import { onRequestPost, usState } from "../functions/api/e.js";

const R26 = RULES_BY_YEAR[2026];
const input = { region: "nyc", employer: "agency", medicaid: "yes", rate: 18.37, regularHours: 47.5, shifts24: 1, sleepMissed: 0, mealsMissed: 0, livesIn: false, stubGross: 812.44 };

test("calc event has only allowlisted fields and none of the typed numbers", () => {
  const r = computeWeek(input, R26);
  const ev = calcEvent(r, input, { lang: "en", returning: "n", year: 2026 });
  assert.equal(ev.e, "calc");
  for (const k of Object.keys(ev)) assert.ok(k === "e" || k in SCHEMA.calc, `unexpected field ${k}`);
  const text = JSON.stringify(ev);
  for (const n of ["18.37", "47.5", "812.44", "812"]) assert.ok(!text.includes(n), `leaked ${n}`);
  assert.equal(ev.region, "nyc");
  assert.equal(ev.status, r.status);
});

test("sanitize drops unknown events, unknown fields and bad values", () => {
  assert.equal(sanitize({ e: "hack" }), null);
  const ev = sanitize({ e: "calc", rate: 21.5, hours: "47", region: "nyc", status: "bad", name: "Ana" });
  assert.deepEqual(ev, { e: "calc", region: "nyc", status: "bad" });
  assert.equal(sanitize({ e: "view", page: "/pay/?q=secret" }).page, undefined);
});

test("bands are coarse", () => {
  assert.equal(hoursBand(47.5), "41-50");
  assert.equal(hoursBand(70), "61+");
  assert.equal(gapBand(0), "none");
  assert.equal(gapBand(2.65), "2-3");
  assert.equal(stubBand(null, 900), "none");
  assert.equal(stubBand(812.44, 1000), "short50-200");
  assert.equal(stubBand(1010, 1000), "over");
});

function fakeEnv() { const points = []; return { points, env: { EVENTS: { writeDataPoint: (p) => points.push(p) } } }; }
const req = (body, origin = "https://carepayny.com") =>
  new Request("https://carepayny.com/api/e", { method: "POST", headers: { Origin: origin }, body });

test("endpoint writes one sanitized data point and drops extra fields", async () => {
  const { points, env } = fakeEnv();
  const res = await onRequestPost({ request: req(JSON.stringify({ e: "calc", region: "liw", status: "check", rate: 19.1 })), env });
  assert.equal(res.status, 204);
  assert.equal(points.length, 1);
  assert.equal(points[0].blobs[0], "calc");
  assert.ok(!JSON.stringify(points[0]).includes("19.1"));
});

test("endpoint ignores other websites and junk", async () => {
  const { points, env } = fakeEnv();
  await onRequestPost({ request: req(JSON.stringify({ e: "view", lang: "en" }), "https://evil.example"), env });
  await onRequestPost({ request: req("not json"), env });
  await onRequestPost({ request: req("x".repeat(2000)), env });
  assert.equal(points.length, 0);
});

const withCf = (r, cf) => { Object.defineProperty(r, "cf", { value: cf }); return r; };

test("endpoint adds country and U.S. state from Cloudflare, never the IP", async () => {
  const { points, env } = fakeEnv();
  const r = withCf(req(JSON.stringify({ e: "view", lang: "en", page: "/" })), { country: "US", regionCode: "NY", city: "Brooklyn" });
  r.headers.set("CF-Connecting-IP", "203.0.113.7");
  await onRequestPost({ request: r, env });
  const blobs = points[0].blobs;
  assert.deepEqual(blobs.slice(-2), ["US", "NY"]);
  const all = JSON.stringify(points[0]);
  assert.ok(!all.includes("203.0.113.7"), "no IP");
  assert.ok(!all.includes("Brooklyn"), "no city");
});

test("state is only kept for U.S. visitors and only as a two-letter code", () => {
  assert.equal(usState({ country: "US", regionCode: "nj" }), "NJ");
  assert.equal(usState({ country: "CA", regionCode: "ON" }), "");
  assert.equal(usState({ country: "US", regionCode: "New York" }), "");
  assert.equal(usState({ country: "US" }), "");
  assert.equal(usState(undefined), "");
});

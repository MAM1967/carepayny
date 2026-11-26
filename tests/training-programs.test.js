// The training program list (src/data/training-programs.js) and its outbound link counter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import DATA from "../src/data/training-programs.js";
import { sanitize } from "../src/lib/events.js";
import { onRequestGet, mapUrl, webUrl, UTM } from "../functions/go/[id].js";

const P = DATA.programs;

test("every listing is complete and comes from the DOH list", () => {
  assert.match(DATA.reportDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(DATA.lastChecked, /^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  assert.match(DATA.source, /^https:\/\/www\.health\.ny\.gov\//);
  assert.ok(P.length > 100, "list looks too short");
  const ids = new Set();
  for (const p of P) {
    assert.match(p.id, /^[a-z0-9-]{1,64}$/, p.id);
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(p.name && p.address && p.city && p.county, p.id);
    assert.ok(DATA.regions.includes(p.region), `${p.id} region`);
    assert.match(p.zip, /^\d{5}$/, p.id);
    assert.match(p.phone, /^\(\d{3}\) \d{3}-\d{4}$/, p.id);
    assert.ok(p.hha || p.pca, `${p.id} has no program type`);
    const okLangs = (a) => a.every((l) => ["en", "es", "zh", "ru", "ko"].includes(l));
    assert.equal(p.hha, p.hhaLangs.length > 0, `${p.id} HHA languages`);
    assert.equal(p.pca, p.pcaLangs.length > 0, `${p.id} PCA languages`);
    assert.ok(okLangs(p.hhaLangs) && okLangs(p.pcaLangs), p.id);
    assert.ok(p.hybrid.every((h) => (h === "HHA" && p.hha) || (h === "PCA" && p.pca)), p.id);
  }
});

test("the list covers the whole state, not only New York City", () => {
  assert.equal(DATA.regions.length, 10);
  for (const r of DATA.regions) assert.ok(P.some((p) => p.region === r), `no programs in ${r}`);
  assert.ok(P.filter((p) => p.region !== "New York City").length > 300);
});

test("listing order is neutral: by county, then A to Z", () => {
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    const ok = a.county < b.county || (a.county === b.county && a.name.toLowerCase() <= b.name.toLowerCase());
    assert.ok(ok, `${a.id} before ${b.id}`);
  }
});

test("out events carry only the program id, link kind and language", () => {
  const ev = sanitize({ e: "out", lang: "en", prog: P[0].id, kind: "tel", phone: "(718) 555-0100", name: "Ana" });
  assert.deepEqual(ev, { e: "out", lang: "en", prog: P[0].id, kind: "tel" });
  assert.equal(sanitize({ e: "out", prog: "../x?y=1", kind: "sms" }).prog, undefined);
});

function fakeEnv() { const points = []; return { points, env: { EVENTS: { writeDataPoint: (p) => points.push(p) } } }; }
const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const get = (path, ua = PHONE) => new Request(`https://carepayny.com${path}`, { headers: { "User-Agent": ua } });

test("/go/ redirects to the map without counting (taps are counted in the browser)", async () => {
  const p = P[0];
  const { points, env } = fakeEnv();
  const res = await onRequestGet({ request: get(`/go/${p.id}?to=map`), params: { id: p.id }, env });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), mapUrl(p));
  assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.equal(points.length, 0);
});

test("/go/ sends unknown ids and missing websites back to the list, without counting", async () => {
  const { points, env } = fakeEnv();
  let res = await onRequestGet({ request: get("/go/no-such-program?to=map"), params: { id: "no-such-program" }, env });
  assert.equal(res.headers.get("Location"), "https://carepayny.com/training/programs/");
  const noWeb = P.find((p) => !p.url);
  res = await onRequestGet({ request: get(`/go/${noWeb.id}?to=web`), params: { id: noWeb.id }, env });
  assert.equal(res.headers.get("Location"), "https://carepayny.com/training/programs/");
  assert.equal(points.length, 0);
});

test("website links get the CarePayNY tracking tags", () => {
  const u = new URL(webUrl({ url: "https://example.org/train?x=1" }));
  for (const [k, v] of Object.entries(UTM)) assert.equal(u.searchParams.get(k), v);
  assert.equal(u.searchParams.get("x"), "1");
  assert.equal(webUrl({ url: null }), null);
});

test("the programs page links straight to maps and websites, never through /go/ (no redirect pages for Google)", () => {
  const src = readFileSync("src/components/ProgramsPage.astro", "utf8");
  assert.ok(!/href=\{`\/go\//.test(src), "programs page still builds /go/ links");
  assert.match(src, /href=\{mapUrl\(p\)\}/);
});

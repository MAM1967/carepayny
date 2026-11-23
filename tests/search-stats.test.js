// Tests for the search-stats Worker (workers/search-stats). No real network calls.
import test from "node:test";
import assert from "node:assert/strict";
import {
  nyDate, lastFullWeeks, addDays, signGoogleJwt, summarizeGoogleDays, topRows, sitemapUrls,
  pickUrlsToInspect, inspectionEntry, summarizeIndex, bingDay, summarizeBing
} from "../workers/search-stats/lib.js";
import worker, { run } from "../workers/search-stats/index.js";

test("weeks are Monday-Sunday in New York time", () => {
  // Monday, Nov 23, 2026, 09:17 UTC = 4:17 AM in New York.
  const w = lastFullWeeks(new Date("2026-11-23T09:17:00Z"), 2);
  assert.deepEqual(w, [{ start: "2026-11-16", end: "2026-11-22" }, { start: "2026-11-09", end: "2026-11-15" }]);
  // Sunday night in New York is already Monday in UTC; the week has not ended yet.
  assert.deepEqual(lastFullWeeks(new Date("2026-11-23T03:00:00Z"), 1), [{ start: "2026-11-09", end: "2026-11-15" }]);
  assert.equal(nyDate(new Date("2026-11-23T03:00:00Z")), "2026-11-22");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("Google JWT is signed with RS256 and verifies", async () => {
  const kp = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(der).toString("base64").match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----\n`;
  const jwt = await signGoogleJwt({ client_email: "bot@x.iam.gserviceaccount.com", private_key: pem }, "scope-a", 1000);
  const [h, c, s] = jwt.split(".");
  const dec = (x) => JSON.parse(Buffer.from(x, "base64url").toString());
  assert.deepEqual(dec(h), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(dec(c), { iss: "bot@x.iam.gserviceaccount.com", scope: "scope-a", aud: "https://oauth2.googleapis.com/token", iat: 1000, exp: 4600 });
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", kp.publicKey, Buffer.from(s, "base64url"), new TextEncoder().encode(`${h}.${c}`));
  assert.equal(ok, true);
  await assert.rejects(signGoogleJwt({}, "x", 1), /client_email/);
});

test("Google totals and top rows", () => {
  const days = { rows: [
    { keys: ["2026-11-16"], clicks: 2, impressions: 100, position: 10 },
    { keys: ["2026-11-18"], clicks: 3, impressions: 300, position: 20 }
  ] };
  assert.deepEqual(summarizeGoogleDays(days), { clicks: 5, impressions: 400, avgPosition: 17.5, daysWithData: 2, lastDayWithData: "2026-11-18" });
  assert.deepEqual(summarizeGoogleDays({}), { clicks: 0, impressions: 0, avgPosition: null, daysWithData: 0, lastDayWithData: null });
  const top = topRows({ rows: [{ keys: ["a"], impressions: 1, clicks: 0, position: 3.14 }, { keys: ["b"], impressions: 9, clicks: 1, position: 7 }] }, 1);
  assert.deepEqual(top, [{ key: "b", clicks: 1, impressions: 9, position: 7 }]);
});

test("index check picks unchecked pages first and summarizes", () => {
  const urls = sitemapUrls("<urlset><url><loc>https://carepayny.com/</loc></url><url><loc> https://carepayny.com/a/ </loc></url><url><loc>https://carepayny.com/b/</loc></url></urlset>");
  assert.deepEqual(urls, ["https://carepayny.com/", "https://carepayny.com/a/", "https://carepayny.com/b/"]);
  const state = { "https://carepayny.com/": { checked: "2026-11-20", verdict: "PASS", coverage: "Submitted and indexed" },
    "https://carepayny.com/a/": { checked: "2026-11-10", verdict: "NEUTRAL", coverage: "Discovered - currently not indexed" },
    "https://carepayny.com/gone/": { checked: "2026-11-01", verdict: "PASS" } };
  assert.deepEqual(pickUrlsToInspect(urls, state, 2), ["https://carepayny.com/b/", "https://carepayny.com/a/"]);
  const s = summarizeIndex(urls, state, "2026-11-23");
  assert.equal(s.sitemapPages, 3);
  assert.equal(s.indexed, 1);
  assert.equal(s.notIndexed, 1);
  assert.equal(s.notChecked, 1);
  assert.equal(s.oldestCheck, "2026-11-10");
  assert.deepEqual(s.notIndexedUrls, ["https://carepayny.com/a/"]);
  assert.deepEqual(inspectionEntry({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }, "2026-11-23"),
    { checked: "2026-11-23", verdict: "PASS", coverage: "Submitted and indexed", lastCrawl: "" });
  assert.equal(inspectionEntry({}, "d").verdict, "UNKNOWN");
});

test("Bing dates and weekly totals", () => {
  // Midnight Pacific on Nov 16, 2026 = 08:00 UTC.
  const d16 = `/Date(${Date.parse("2026-11-16T08:00:00Z")}-0800)/`;
  const d22 = `/Date(${Date.parse("2026-11-22T08:00:00Z")}-0800)/`;
  const d23 = `/Date(${Date.parse("2026-11-23T08:00:00Z")}-0800)/`;
  assert.equal(bingDay(d16), "2026-11-16");
  assert.equal(bingDay("/Date(0)/"), "1970-01-01");
  assert.equal(bingDay("nope"), null);
  const week = { start: "2026-11-16", end: "2026-11-22" };
  const b = summarizeBing(week,
    [{ Date: d16, Clicks: 1, Impressions: 10 }, { Date: d22, Clicks: 2, Impressions: 20 }, { Date: d23, Clicks: 9, Impressions: 99 }],
    [{ Date: d16, InIndex: 40, CrawledPages: 5, CrawlErrors: 1 }, { Date: d22, InIndex: 55, CrawledPages: 7, CrawlErrors: 0 }, { Date: d23, InIndex: 60 }],
    [{ Date: d16, Query: "cdpap pay", Clicks: 1, Impressions: 5 }, { Date: d22, Query: "cdpap pay", Clicks: 0, Impressions: 4 }, { Date: d22, Query: "ppl", Clicks: 0, Impressions: 2 }]);
  assert.deepEqual(b, { clicks: 3, impressions: 30, daysWithData: 2, inIndex: 55, inIndexDay: "2026-11-22", crawledPages: 12, crawlErrors: 1,
    topQueries: [{ key: "cdpap pay", clicks: 1, impressions: 9 }, { key: "ppl", clicks: 0, impressions: 2 }] });
});

function fakeKV() {
  const m = new Map();
  return { m,
    async get(k, type) { const v = m.get(k); return v == null ? null : type === "json" ? JSON.parse(v) : v; },
    async put(k, v) { m.set(k, v); } };
}

test("a run with no secrets saves empty weeks and says what is missing", async () => {
  const kv = fakeKV();
  await run({ SEARCH: kv, GSC_SITE: "sc-domain:carepayny.com" }, new Date("2026-11-23T09:17:00Z"));
  const status = JSON.parse(kv.m.get("status"));
  assert.equal(status.day, "2026-11-23");
  assert.deepEqual(status.weeks, ["2026-11-16", "2026-11-09"]);
  assert.match(status.errors.join(" "), /GSC_SERVICE_ACCOUNT_JSON/);
  assert.match(status.errors.join(" "), /BING_API_KEY/);
  assert.deepEqual(JSON.parse(kv.m.get("week:2026-11-16")).google, null);
  assert.equal((await worker.fetch()).status, 404);
});

test("a full run with mocked Google and Bing", async (t) => {
  const kp = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign"]);
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", kp.privateKey)).toString("base64");
  const sa = JSON.stringify({ client_email: "a@b.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----` });
  const d17 = `/Date(${Date.parse("2026-11-17T08:00:00Z")}-0800)/`;
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init = {}) => {
    calls.push(String(url));
    const json = (o) => new Response(JSON.stringify(o), { status: 200 });
    if (url.includes("oauth2")) return json({ access_token: "tok" });
    if (url.endsWith("sitemap.xml")) return new Response("<loc>https://carepayny.com/</loc><loc>https://carepayny.com/rates/</loc>");
    if (url.includes("urlInspection")) {
      assert.equal(init.headers.Authorization, "Bearer tok");
      const u = JSON.parse(init.body).inspectionUrl;
      return json({ inspectionResult: { indexStatusResult: { verdict: u.endsWith("/rates/") ? "NEUTRAL" : "PASS", coverageState: "x" } } });
    }
    if (url.includes("searchAnalytics")) {
      const body = JSON.parse(init.body);
      assert.ok(url.includes(encodeURIComponent("sc-domain:carepayny.com")));
      if (body.dimensions[0] === "date") return json({ rows: [{ keys: [body.startDate], clicks: 4, impressions: 80, position: 12 }] });
      return json({ rows: [{ keys: [body.dimensions[0] + "-top"], clicks: 1, impressions: 50, position: 9 }] });
    }
    if (url.includes("GetRankAndTrafficStats")) return json({ d: [{ Date: d17, Clicks: 2, Impressions: 40 }] });
    if (url.includes("GetCrawlStats")) return json({ d: [{ Date: d17, InIndex: 30, CrawledPages: 3, CrawlErrors: 0 }] });
    if (url.includes("GetQueryStats")) return json({ d: [{ Date: d17, Query: "home care pay", Clicks: 1, Impressions: 12 }] });
    return new Response("unexpected " + url, { status: 500 });
  });
  const kv = fakeKV();
  await run({ SEARCH: kv, GSC_SITE: "sc-domain:carepayny.com", BING_SITE: "https://carepayny.com/", SITEMAP_URL: "https://carepayny.com/sitemap.xml",
    INSPECT_PER_RUN: "25", GSC_SERVICE_ACCOUNT_JSON: sa, BING_API_KEY: "k" }, new Date("2026-11-23T09:17:00Z"));
  assert.deepEqual(JSON.parse(kv.m.get("status")).errors, []);
  const idx = JSON.parse(kv.m.get("google-index:2026-11-23"));
  assert.equal(idx.indexed, 1);
  assert.equal(idx.notIndexed, 1);
  const wk = JSON.parse(kv.m.get("week:2026-11-16"));
  assert.equal(wk.google.impressions, 80);
  assert.equal(wk.google.topQueries[0].key, "query-top");
  assert.equal(wk.google.topPages[0].key, "page-top");
  assert.equal(wk.bing.impressions, 40);
  assert.equal(wk.bing.inIndex, 30);
  assert.equal(wk.bing.topQueries[0].key, "home care pay");
  // The earlier week has Google rows but no Bing rows inside it.
  assert.equal(JSON.parse(kv.m.get("week:2026-11-09")).bing.impressions, 0);
  // Stays under the free plan's 50 outside requests: 1 sign-in + 1 sitemap + 2 inspections + 6 Google + 3 Bing.
  assert.equal(calls.length, 13);
});

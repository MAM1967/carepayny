// Pure helpers for the search-stats Worker (see index.js and docs/search-stats.md).
// No network calls here, so tests/search-stats.test.js can run them in Node.

const DAY = 86400000;

/** Calendar date (YYYY-MM-DD) in New York for a Date. */
export function nyDate(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(d);
}

/** Add whole days to a YYYY-MM-DD date. */
export function addDays(iso, n) {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
}

/**
 * The last `count` full Monday-Sunday weeks before `now` (New York dates), newest first.
 * On Monday, November 23, 2026, the first one is November 16-22.
 */
export function lastFullWeeks(now, count = 2) {
  const today = nyDate(now);
  const dow = new Date(today + "T00:00:00Z").getUTCDay(); // 0 = Sunday
  const thisMonday = addDays(today, -((dow + 6) % 7));
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(thisMonday, -7 * (i + 1));
    return { start, end: addDays(start, 6) };
  });
}

// ---------- Google service-account sign-in (JWT, RS256) ----------

function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlText = (t) => b64url(new TextEncoder().encode(t));

/** A signed JWT that Google trades for an access token. `sa` is the service account JSON key. */
export async function signGoogleJwt(sa, scope, nowSec) {
  if (!sa || !sa.client_email || !sa.private_key) throw new Error("service account JSON is missing client_email or private_key");
  const header = { alg: "RS256", typ: "JWT" };
  const claims = { iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: nowSec, exp: nowSec + 3600 };
  const unsigned = `${b64urlText(JSON.stringify(header))}.${b64urlText(JSON.stringify(claims))}`;
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64url(sig)}`;
}

// ---------- Google Search Console ----------

/** Totals from a searchAnalytics query with dimensions ["date"]. */
export function summarizeGoogleDays(resp) {
  const rows = (resp && resp.rows) || [];
  let clicks = 0, impressions = 0, posWeighted = 0, lastDay = null;
  for (const r of rows) {
    clicks += r.clicks || 0;
    impressions += r.impressions || 0;
    posWeighted += (r.position || 0) * (r.impressions || 0);
    const day = r.keys && r.keys[0];
    if (day && (!lastDay || day > lastDay)) lastDay = day;
  }
  return {
    clicks,
    impressions,
    avgPosition: impressions ? Math.round((posWeighted / impressions) * 10) / 10 : null,
    daysWithData: rows.length,
    lastDayWithData: lastDay
  };
}

/** Top rows of a one-dimension searchAnalytics query, as { key, clicks, impressions, position }. */
export function topRows(resp, n = 10) {
  return ((resp && resp.rows) || [])
    .slice()
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
    .slice(0, n)
    .map((r) => ({
      key: r.keys && r.keys[0],
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      position: r.position != null ? Math.round(r.position * 10) / 10 : null
    }));
}

/** Page URLs from sitemap XML. */
export function sitemapUrls(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/**
 * Which URLs to inspect this run: never-checked first, then the longest ago.
 * `state` maps URL -> { checked: "YYYY-MM-DD", verdict, coverage }.
 */
export function pickUrlsToInspect(urls, state, n) {
  return urls
    .slice()
    .sort((a, b) => {
      const ca = (state[a] && state[a].checked) || "";
      const cb = (state[b] && state[b].checked) || "";
      return ca < cb ? -1 : ca > cb ? 1 : 0;
    })
    .slice(0, n);
}

/** Pull the parts we keep from a URL Inspection API response. */
export function inspectionEntry(resp, day) {
  const r = (resp && resp.inspectionResult && resp.inspectionResult.indexStatusResult) || {};
  return { checked: day, verdict: r.verdict || "UNKNOWN", coverage: r.coverageState || "", lastCrawl: r.lastCrawlTime || "" };
}

/** Index summary for the URLs now in the sitemap. Google's PASS verdict means "on Google." */
export function summarizeIndex(urls, state, day) {
  let indexed = 0, notIndexed = 0, notChecked = 0, oldest = null;
  const coverage = {};
  const notIndexedUrls = [];
  for (const u of urls) {
    const s = state[u];
    if (!s) { notChecked++; continue; }
    if (!oldest || s.checked < oldest) oldest = s.checked;
    coverage[s.coverage || "(none)"] = (coverage[s.coverage || "(none)"] || 0) + 1;
    if (s.verdict === "PASS") indexed++;
    else { notIndexed++; notIndexedUrls.push(u); }
  }
  return { day, sitemapPages: urls.length, indexed, notIndexed, notChecked, oldestCheck: oldest, coverage, notIndexedUrls: notIndexedUrls.slice(0, 25) };
}

// ---------- Bing Webmaster Tools ----------

/** Bing's "/Date(1763337600000-0800)/" as a YYYY-MM-DD date in Bing's own offset. */
export function bingDay(s) {
  const m = /\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(String(s || ""));
  if (!m) return null;
  let ms = Number(m[1]);
  if (m[2]) {
    const sign = m[2][0] === "-" ? -1 : 1;
    ms += sign * (Number(m[2].slice(1, 3)) * 60 + Number(m[2].slice(3))) * 60000;
  }
  return new Date(ms).toISOString().slice(0, 10);
}

const inWeek = (day, w) => day && day >= w.start && day <= w.end;

/** Bing totals for one week from GetRankAndTrafficStats, GetCrawlStats and GetQueryStats rows. */
export function summarizeBing(week, traffic, crawl, queries, n = 10) {
  let clicks = 0, impressions = 0, days = 0;
  for (const r of traffic || []) {
    if (!inWeek(bingDay(r.Date), week)) continue;
    clicks += r.Clicks || 0;
    impressions += r.Impressions || 0;
    days++;
  }
  // Pages in Bing's index: the latest crawl-stats day inside the week.
  let inIndex = null, inIndexDay = null, crawled = 0, crawlErrors = 0;
  for (const r of crawl || []) {
    const d = bingDay(r.Date);
    if (!inWeek(d, week)) continue;
    crawled += r.CrawledPages || 0;
    crawlErrors += r.CrawlErrors || 0;
    if (!inIndexDay || d > inIndexDay) { inIndexDay = d; inIndex = r.InIndex ?? null; }
  }
  const byQuery = {};
  for (const r of queries || []) {
    if (!inWeek(bingDay(r.Date), week)) continue;
    const q = (byQuery[r.Query] ||= { key: r.Query, clicks: 0, impressions: 0 });
    q.clicks += r.Clicks || 0;
    q.impressions += r.Impressions || 0;
  }
  const topQueries = Object.values(byQuery).sort((a, b) => b.impressions - a.impressions).slice(0, n);
  return { clicks, impressions, daysWithData: days, inIndex, inIndexDay, crawledPages: crawled, crawlErrors, topQueries };
}

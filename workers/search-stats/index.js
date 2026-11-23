// carepayny-search-stats: a small scheduled Worker (no public URL).
// Once a day it reads Google Search Console and Bing Webmaster Tools for carepayny.com
// and saves weekly totals in the Workers KV namespace "carepayny_search", where the
// weekly traffic report reads them. It collects nothing from site visitors.
// Setup and key names: docs/search-stats.md.
import {
  nyDate, lastFullWeeks, signGoogleJwt, summarizeGoogleDays, topRows, sitemapUrls,
  pickUrlsToInspect, inspectionEntry, summarizeIndex, summarizeBing
} from "./lib.js";

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const INDEX_KEY_TTL = 60 * 60 * 24 * 400; // keep daily index snapshots about 13 months

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env, new Date(event.scheduledTime)));
  },
  async fetch() {
    return new Response("Not found", { status: 404 });
  }
};

async function getJson(url, init, what) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${what}: HTTP ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

async function googleToken(env) {
  const sa = JSON.parse(env.GSC_SERVICE_ACCOUNT_JSON);
  const jwt = await signGoogleJwt(sa, GOOGLE_SCOPE, Math.floor(Date.now() / 1000));
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt });
  const tok = await getJson("https://oauth2.googleapis.com/token", { method: "POST", body }, "Google sign-in");
  return tok.access_token;
}

async function googleQuery(env, token, week, dimensions, rowLimit) {
  const site = encodeURIComponent(env.GSC_SITE);
  return getJson(`https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: week.start, endDate: week.end, dimensions, rowLimit, dataState: "all" })
  }, `Search Console ${dimensions.join(",") || "totals"}`);
}

async function bingGet(env, method) {
  const q = new URLSearchParams({ siteUrl: env.BING_SITE, apikey: env.BING_API_KEY });
  const r = await getJson(`https://ssl.bing.com/webmaster/api.svc/json/${method}?${q}`, {}, `Bing ${method}`);
  return r.d || [];
}

export async function run(env, now) {
  const today = nyDate(now);
  const weeks = lastFullWeeks(now, 2);
  const errors = [];
  const note = (e) => errors.push(String(e && e.message ? e.message : e).slice(0, 300));

  // ---- Google ----
  let token = null;
  if (!env.GSC_SERVICE_ACCOUNT_JSON) errors.push("Google: secret GSC_SERVICE_ACCOUNT_JSON is not set");
  else {
    try { token = await googleToken(env); } catch (e) { note(e); }
  }

  // Index check: inspect a few sitemap pages each day, oldest check first.
  if (token) {
    try {
      const xml = await (await fetch(env.SITEMAP_URL)).text();
      const urls = sitemapUrls(xml);
      const state = (await env.SEARCH.get("google-inspect", "json")) || {};
      const n = Number(env.INSPECT_PER_RUN) || 25;
      for (const url of pickUrlsToInspect(urls, state, n)) {
        try {
          const r = await getJson("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inspectionUrl: url, siteUrl: env.GSC_SITE })
          }, "URL Inspection");
          state[url] = inspectionEntry(r, today);
        } catch (e) { note(e); break; }
      }
      // Forget pages that left the sitemap.
      for (const u of Object.keys(state)) if (!urls.includes(u)) delete state[u];
      await env.SEARCH.put("google-inspect", JSON.stringify(state));
      await env.SEARCH.put(`google-index:${today}`, JSON.stringify(summarizeIndex(urls, state, today)), { expirationTtl: INDEX_KEY_TTL });
    } catch (e) { note(e); }
  }

  // ---- Bing (fetched once, split into weeks) ----
  let bing = null;
  if (!env.BING_API_KEY) errors.push("Bing: secret BING_API_KEY is not set");
  else {
    try {
      bing = {
        traffic: await bingGet(env, "GetRankAndTrafficStats"),
        crawl: await bingGet(env, "GetCrawlStats"),
        queries: await bingGet(env, "GetQueryStats")
      };
    } catch (e) { note(e); }
  }

  // ---- Weekly snapshots (re-pulled daily while Google's late data fills in) ----
  for (const week of weeks) {
    const snap = { week, updatedAt: now.toISOString(), google: null, bing: null };
    if (token) {
      try {
        const [days, queries, pages] = [
          await googleQuery(env, token, week, ["date"], 10),
          await googleQuery(env, token, week, ["query"], 25),
          await googleQuery(env, token, week, ["page"], 25)
        ];
        snap.google = { ...summarizeGoogleDays(days), topQueries: topRows(queries, 10), topPages: topRows(pages, 10) };
      } catch (e) { note(e); }
    }
    if (bing) snap.bing = summarizeBing(week, bing.traffic, bing.crawl, bing.queries, 10);
    await env.SEARCH.put(`week:${week.start}`, JSON.stringify(snap));
  }

  await env.SEARCH.put("status", JSON.stringify({ lastRun: now.toISOString(), day: today, weeks: weeks.map((w) => w.start), errors }));
}

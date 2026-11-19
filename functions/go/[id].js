// GET /go/<program id>?to=map|web&l=<lang> — outbound links from /training/programs/.
// Counts one anonymous "out" event (program id, link kind, language, country) and
// redirects. Every outbound program link goes through here, so a link can later be
// changed in one place (for example, to add a tracking tag) without editing pages.
// Phone links are not redirected; the page counts them with the same "out" event.
import { sanitize, SCHEMA } from "../../src/lib/events.js";
import DATA from "../../src/data/training-programs.js";

const BY_ID = new Map(DATA.programs.map((p) => [p.id, p]));
const DIRECTORY = "/training/programs/";
// Tags added to program websites so the program can see visits from CarePayNY in its own analytics.
export const UTM = { utm_source: "carepayny", utm_medium: "referral", utm_campaign: "training-directory" };

export function mapUrl(p) {
  const q = `${p.name}, ${p.address}, ${p.city}, NY ${p.zip}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function webUrl(p) {
  if (!p.url) return null;
  try {
    const u = new URL(p.url);
    for (const [k, v] of Object.entries(UTM)) u.searchParams.set(k, v);
    return u.toString();
  } catch { return null; }
}

// Search engines and AI tools follow these links too. Their visits are not people, so they
// are not counted. The user agent is only checked here; it is never stored or sent.
const CRAWLER = /bot|crawl|spider|slurp|preview|fetch|-user\b|headless|python|curl|wget|httpclient|java\//i;
export function isCrawler(request) {
  const ua = request.headers.get("User-Agent") || "";
  return ua === "" || CRAWLER.test(ua);
}

const redirect = (to) => new Response(null, {
  status: 302,
  headers: { Location: to, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
});

export async function onRequestGet({ request, params, env }) {
  const url = new URL(request.url);
  const p = BY_ID.get(String(params.id || ""));
  const kind = url.searchParams.get("to") === "web" ? "web" : "map";
  const dest = p && (kind === "web" ? webUrl(p) : mapUrl(p));
  if (!dest) return redirect(new URL(DIRECTORY, url).toString());

  if (isCrawler(request)) return redirect(dest);

  try {
    const ev = sanitize({ e: "out", lang: url.searchParams.get("l") || "en", prog: p.id, kind });
    if (ev && env && env.EVENTS) {
      const country = (request.cf && request.cf.country) || "XX";
      env.EVENTS.writeDataPoint({
        indexes: [ev.e],
        blobs: [ev.e, ...Object.keys(SCHEMA[ev.e]).map((k) => ev[k] ?? ""), country],
        doubles: [1]
      });
    }
  } catch { /* counting must never block the link */ }
  return redirect(dest);
}

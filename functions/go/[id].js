// GET /go/<program id>?to=map|web — outbound links from /training/programs/.
// Only redirects. Every outbound program link goes through here, so a link can later be
// changed in one place (for example, to add a tracking tag) without editing pages.
// Taps are counted in the browser by the programs page, not here: scrapers that follow
// links without tapping them made server-side counts useless (Nov 2026).
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

const redirect = (to) => new Response(null, {
  status: 302,
  headers: { Location: to, "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
});

export async function onRequestGet({ request, params }) {
  const url = new URL(request.url);
  const p = BY_ID.get(String(params.id || ""));
  const kind = url.searchParams.get("to") === "web" ? "web" : "map";
  const dest = p && (kind === "web" ? webUrl(p) : mapUrl(p));
  if (!dest) return redirect(new URL(DIRECTORY, url).toString());

  return redirect(dest);
}

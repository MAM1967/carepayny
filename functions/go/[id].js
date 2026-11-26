// GET /go/<program id>?to=map|web — old outbound links from /training/programs/.
// Only redirects, with a noindex header. Since Nov 26, 2026 the programs page links straight to the
// map or website (src/lib/program-links.js), so search engines stop finding redirecting /go/ pages.
// This stays for /go/ links people already shared or bookmarked.
// Taps are counted in the browser by the programs page, not here: scrapers that follow
// links without tapping them made server-side counts useless (Nov 2026).
import DATA from "../../src/data/training-programs.js";

const BY_ID = new Map(DATA.programs.map((p) => [p.id, p]));
import { mapUrl, webUrl, UTM } from "../../src/lib/program-links.js";
export { mapUrl, webUrl, UTM };

const DIRECTORY = "/training/programs/";

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

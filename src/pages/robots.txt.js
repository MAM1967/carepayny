import { LAUNCHED } from "../data/site.js";

export function GET() {
  const body = LAUNCHED
    ? "User-agent: *\nAllow: /\n"
    : "# Pre-launch: not open to search engines yet.\nUser-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}

import { LAUNCHED } from "../data/site.js";

// Before launch: closed to all crawlers. At launch: open to search engines and
// to AI answer tools (owner decision, November 11, 2026), with the sitemap listed.
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",         // OpenAI
  "ClaudeBot", "Claude-SearchBot", "Claude-User",    // Anthropic
  "PerplexityBot", "Perplexity-User",                // Perplexity
  "Google-Extended",                                 // Google AI (Gemini)
  "Applebot-Extended",                               // Apple AI
  "Bingbot"                                          // Bing (also powers ChatGPT search)
];

export function GET() {
  const body = LAUNCHED
    ? [
        "User-agent: *",
        "Allow: /",
        // /go/ (the outbound link counter) is NOT blocked here. A robots.txt block stops Google
        // from seeing the "noindex" header that /go/ sends, so Google indexed those links anyway
        // (Search Console, Nov 2026). Crawlers may fetch /go/; it is kept out of search by its
        // X-Robots-Tag header. /go/ only redirects; taps are counted in the browser.
        "",
        ...AI_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, "Allow: /", ""]),
        "Sitemap: https://carepayny.com/sitemap.xml",
        ""
      ].join("\n")
    : "# Pre-launch: not open to search engines yet.\nUser-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}

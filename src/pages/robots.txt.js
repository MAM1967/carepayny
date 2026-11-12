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
        "",
        ...AI_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, "Allow: /", ""]),
        "Sitemap: https://carepayny.com/sitemap.xml",
        ""
      ].join("\n")
    : "# Pre-launch: not open to search engines yet.\nUser-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}

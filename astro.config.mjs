import { defineConfig } from "astro/config";
import { remarkTokens } from "./src/lib/tokens.js";

// Static site. Language folders (/es/, /zh/ …) are added only after a
// native-speaker review is in place for each language (see docs/PRD.md).
export default defineConfig({
  site: "https://carepayny.com",
  output: "static",
  trailingSlash: "ignore",
  // Inline the site's one small stylesheet (about 11 KB) so it doesn't block the first paint.
  build: { inlineStylesheets: "always" },
  markdown: { remarkPlugins: [remarkTokens] },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
    routing: { prefixDefaultLocale: false }
  }
});

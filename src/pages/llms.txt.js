import { getCollection } from "astro:content";
import { SITE_URL, guideHref } from "../lib/seo.js";
import { RULES } from "../data/rules.js";

// llms.txt: a plain-text map of the site for AI answer tools (llmstxt.org format).
export async function GET() {
  const guide = (await getCollection("guide")).sort((a, b) => a.data.order - b.data.order);
  const body = `# CarePayNY

> Free, independent website for home care workers in New York State. It explains the state's home care pay rules (home care aide minimum wage, wage parity, overtime, 24-hour shifts) and the CDPAP program run through PPL, in plain English. Every page links to its official sources and shows a "last checked" date. CarePayNY is not part of PPL, the NYS Department of Health, the Department of Labor or Medicaid, and does not give legal advice.

Pay rules in use: version ${RULES.version}, in effect since ${RULES.effective}, last reviewed ${RULES.lastReviewed}.

## Pay check

- [Pay check calculator](${SITE_URL}/): checks one week of pay against New York's home care pay rules and PPL's posted CDPAP rate. Runs in the browser; nothing entered is saved.

## CDPAP guide

${guide.map((p) => `- [${p.data.title}](${SITE_URL}${guideHref(p.id)}): ${p.data.description}`).join("\n")}

## About

- [About CarePayNY](${SITE_URL}/about/): who runs the site, how the rules are checked, and how to report a mistake.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

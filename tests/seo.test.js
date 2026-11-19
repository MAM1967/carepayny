import { test } from "node:test";
import assert from "node:assert/strict";
import { faqFromHtml } from "../src/lib/seo.js";

test("faqFromHtml: question headings become questions, text below becomes the answer", () => {
  const html = `<p>Lead.</p><h2 id="a">Does CDPAP pay overtime?</h2><p>Yes. Hours over 40 &amp; more.</p><ul><li>One</li><li>Two</li></ul><h2>Word list</h2><p>Not a question.</p><h2>是否有病假？</h2><p>有。</p>`;
  assert.deepEqual(faqFromHtml(html), [
    { question: "Does CDPAP pay overtime?", answer: "Yes. Hours over 40 & more.\nOne\nTwo" },
    { question: "是否有病假？", answer: "有。" }
  ]);
});

import { pageTitle, TITLE_MAX } from "../src/lib/seo.js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

test("pageTitle adds the site name only when it fits", () => {
  assert.equal(pageTitle("CarePayNY"), "CarePayNY");
  assert.equal(pageTitle("Rates"), "Rates | CarePayNY");
  const long = "x".repeat(65);
  assert.equal(pageTitle(long), long);
});

test("every English guide title fits in 70 characters (site rule 11)", () => {
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") && files.push(p); } };
  walk("src/content/en");
  for (const f of files) {
    const m = readFileSync(f, "utf8").match(/^title:\s*["']?(.+?)["']?\s*$/m);
    assert.ok(m, `${f} has a title`);
    assert.ok(pageTitle(m[1]).length <= TITLE_MAX, `${f}: "${m[1]}" is ${m[1].length} characters; keep it at ${TITLE_MAX} or less`);
  }
});

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

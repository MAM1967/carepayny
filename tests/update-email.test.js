// Update emails (broadcasts): tokens filled from rules.js, absolute links, language links,
// unsubscribe link, postal address required before a draft, and no tracking.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { renderUpdate, parseUpdate, markdownToEmail, UNSUBSCRIBE } from "../src/lib/update-email.js";

const FILES = readdirSync("emails").filter((f) => f.endsWith(".md"));
const ADDRESS = "Test LLC, 1 Main St, Albany, NY 12207";

test("there is at least one update in emails/", () => assert.ok(FILES.length >= 1));

for (const f of FILES) {
  const src = readFileSync(`emails/${f}`, "utf8");
  test(`${f}: builds, with tokens filled and everything an update email needs`, () => {
    const e = renderUpdate(src, { postalAddress: ADDRESS, strict: true });
    assert.ok(e.subject.length > 0 && e.subject.length <= 78, "subject length");
    for (const out of [e.html, e.text]) {
      assert.ok(!/\{\{(?!\{RESEND_UNSUBSCRIBE_URL\}\}\})/.test(out.replace(UNSUBSCRIBE, "")), "no unfilled {{token}}");
      assert.ok(out.includes(UNSUBSCRIBE), "unsubscribe link");
      assert.ok(out.includes(ADDRESS), "postal address");
      for (const l of ["es", "zh", "ru"]) assert.ok(out.includes(`https://carepayny.com/${l}${e.page}`), `link to ${l} page`);
    }
    assert.ok(!/href="\//.test(e.html), "every link is absolute");
    assert.ok(!/<img/i.test(e.html), "no images or tracking pixels");
  });
  test(`${f}: no typed pay rates (rule 2), only {{tokens}}`, () => {
    const { body } = parseUpdate(src);
    assert.ok(!/\$\d/.test(body), "a dollar figure is typed into the update");
  });
  test(`${f}: describes, doesn't direct (rule 4)`, () => {
    assert.ok(!/\byou should\b|\bcontact (a|your)\b|\bcall (a|your|the)\b|\bmake sure\b|\bwe recommend\b/i.test(src));
  });
}

test("a draft can't be built without a postal address; a preview shows a placeholder", () => {
  const src = readFileSync(`emails/${FILES[0]}`, "utf8");
  assert.throws(() => renderUpdate(src, { strict: true }), /POSTAL_ADDRESS/);
  assert.match(renderUpdate(src).text, /POSTAL ADDRESS GOES HERE/);
});

test("markdown: headings, lists, bold, links, and HTML is escaped", () => {
  const { html, text } = markdownToEmail("## Hi <b>\n\nA **b** [c](/pay/)\n\n- one\n- two");
  assert.match(html, /<h2[^>]*>Hi &lt;b&gt;<\/h2>/);
  assert.match(html, /<strong>b<\/strong>/);
  assert.match(html, /href="https:\/\/carepayny\.com\/pay\/"/);
  assert.match(html, /<ul[^>]*><li[^>]*>one<\/li><li[^>]*>two<\/li><\/ul>/);
  assert.match(text, /c \(https:\/\/carepayny\.com\/pay\/\)/);
});

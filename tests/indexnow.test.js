import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSitemap, contentFileToUrl, changedUrls, KEY } from "../scripts/indexnow.mjs";

test("indexnow: key file in public/ matches the key", () => {
  assert.equal(readFileSync(`public/${KEY}.txt`, "utf8").trim(), KEY);
});

test("indexnow: content files map to page URLs", () => {
  assert.equal(contentFileToUrl("src/content/en/cdpap/ppl-sick-leave.md"), "https://carepayny.com/cdpap/ppl-sick-leave/");
  assert.equal(contentFileToUrl("src/content/es/cdpap/not-paid/index.md"), "https://carepayny.com/es/cdpap/not-paid/");
  assert.equal(contentFileToUrl("src/content/en/pay/index.md"), "https://carepayny.com/pay/");
  assert.equal(contentFileToUrl("src/data/rules.js"), null);
});

test("indexnow: sends new pages, moved lastmod and edited files only", () => {
  const xml = (rows) => rows.map(([l, d]) => `<url><loc>${l}</loc><lastmod>${d}</lastmod></url>`).join("");
  const a = "https://carepayny.com/a/", b = "https://carepayny.com/b/", c = "https://carepayny.com/cdpap/c/";
  const oldMap = parseSitemap(xml([[a, "2026-11-01"], [b, "2026-11-01"], [c, "2026-11-01"]]));
  const newMap = parseSitemap(xml([[a, "2026-11-01"], [b, "2026-11-18"], [c, "2026-11-01"], ["https://carepayny.com/d/", "2026-11-18"]]));
  assert.deepEqual(changedUrls(oldMap, newMap, ["src/content/en/cdpap/c.md"]).sort(), [b, c, "https://carepayny.com/d/"].sort());
});

// Every translated page must keep the same {{tokens}} and link URLs as its English page,
// so a translation can never change a pay number or a source link.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src/content";
const files = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? files(p) : p.endsWith(".md") ? [p] : [];
});
const tokens = (t) => [...t.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort();
const urls = (t) => [...t.matchAll(/\]\(([^)\s]+)\)|url:\s*"([^"]+)"/g)].map((m) => m[1] || m[2]).sort();

const langs = readdirSync(ROOT).filter((d) => d !== "en" && statSync(join(ROOT, d)).isDirectory());

test("translation folders mirror English pages", () => {
  for (const lang of langs) {
    for (const f of files(join(ROOT, lang))) {
      const en = join(ROOT, "en", relative(join(ROOT, lang), f));
      assert.ok(existsSync(en), `${f} has no English page at ${en}`);
    }
  }
});

for (const lang of langs) {
  for (const f of files(join(ROOT, lang))) {
    const en = join(ROOT, "en", relative(join(ROOT, lang), f));
    if (!existsSync(en)) continue;
    test(`${f}: same tokens and links as English`, () => {
      const a = readFileSync(en, "utf8"), b = readFileSync(f, "utf8");
      assert.deepEqual(tokens(b), tokens(a), "tokens differ");
      assert.deepEqual(urls(b), urls(a), "links differ");
    });
  }
}

// Every language file must have every English key, keep every {placeholder},
// and keep HTML tags and link addresses exactly (keys ending in .html).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const DIR = "src/i18n/ui";
const load = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
const en = load("en.json");
const keys = Object.keys(en).filter((k) => !k.startsWith("_"));
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tags = (s) => [...String(s).matchAll(/<\/?([a-z]+)(?:\s+href="([^"]*)")?[^>]*>/g)].map((m) => m[1] + (m[2] ? ` ${m[2]}` : "")).sort();

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const dict = load(file);
  test(`${file}: has every English key`, () => {
    const missing = keys.filter((k) => !(k in dict));
    assert.deepEqual(missing, [], `missing keys: ${missing.join(", ")}`);
  });
  test(`${file}: keeps placeholders, tags and links`, () => {
    for (const k of keys) {
      if (!(k in dict)) continue;
      assert.deepEqual(placeholders(dict[k]), placeholders(en[k]), `placeholders differ in ${k}`);
      assert.deepEqual(tags(dict[k]), tags(en[k]), `HTML tags or links differ in ${k}`);
    }
  });
}

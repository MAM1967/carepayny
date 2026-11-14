// Site rule 5: the calculator pages must not load the analytics beacon.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const page of ["src/pages/index.astro", "src/pages/[lang]/index.astro"]) {
  test(`${page} (calculator) turns analytics off`, () => {
    assert.match(readFileSync(page, "utf8"), /<Base\b[^>]*analytics=\{false\}/);
  });
}

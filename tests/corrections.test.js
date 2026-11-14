// The public corrections log (/corrections/) must stay complete and readable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CORRECTIONS } from "../src/data/corrections.js";

const DATE = /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/;

test("every correction has a date, page, what was wrong, what it says now and a source", () => {
  for (const c of CORRECTIONS) {
    assert.match(c.date, DATE, `bad date: ${c.date}`);
    for (const k of ["page", "href", "was", "now"]) assert.ok(c[k] && String(c[k]).trim(), `missing ${k} on ${c.date}`);
    assert.ok(c.source?.label && /^https:\/\//.test(c.source?.url), `missing source on ${c.date}`);
  }
});

test("corrections are listed newest first", () => {
  const t = CORRECTIONS.map((c) => Date.parse(c.date));
  for (let i = 1; i < t.length; i++) assert.ok(t[i - 1] >= t[i], "corrections out of order");
});

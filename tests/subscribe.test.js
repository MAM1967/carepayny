// Email updates (test version): double opt-in with a signed link, no database.
// Proves: only an email + language can be sent, links can't be forged and expire,
// nothing is sent while sign-up is closed, and no email address is ever logged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeEmail, readForm, makeToken, verifyToken, TOKEN_TTL_MS, FROM } from "../src/lib/subscribe.js";
import { EMAIL_TEXT, confirmationEmail } from "../src/i18n/email.js";
import { onRequestPost as subscribe } from "../functions/api/subscribe.js";
import { onRequestPost as confirm } from "../functions/api/confirm.js";

const SECRET = "test-secret-0123456789abcdef";
const ENV = { PUBLIC_EMAIL_SIGNUP_OPEN: "true", RESEND_API_KEY: "re_test", SIGNING_SECRET: SECRET, RESEND_SEGMENT_ID: "seg_1" };
const EMAIL = "aide.test@example.com";

const post = (path, fields, origin = "https://carepayny.com") => new Request(`https://carepayny.com${path}`, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(fields).toString()
});

// Replace fetch and console while a function runs; record calls; fail if the address is ever logged.
async function run(fn) {
  const calls = [];
  const realFetch = globalThis.fetch;
  const real = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  const logged = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify({ id: "x" }), { status: 200 });
  };
  for (const k of Object.keys(real)) console[k] = (...a) => logged.push(a.join(" "));
  try {
    const res = await fn();
    return { res, calls, logged };
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(console, real);
  }
}

test("normalizeEmail accepts normal addresses and rejects bad ones", () => {
  assert.equal(normalizeEmail("  Aide@Example.COM "), "aide@example.com");
  assert.equal(normalizeEmail("maria.lopez+care@mail.example.org"), "maria.lopez+care@mail.example.org");
  for (const bad of ["", "no-at-sign", "a@b", "two@@example.com", "sp ace@example.com", "<x>@example.com", "a@example.c"]) {
    assert.equal(normalizeEmail(bad), null, bad);
  }
});

test("readForm rejects any field beyond email, lang and the honeypot", () => {
  const f = new FormData(); f.set("email", EMAIL); f.set("lang", "es"); f.set("rate", "18.50");
  assert.deepEqual(readForm(f), { error: "generic", lang: "es" });
  const ok = new FormData(); ok.set("email", EMAIL); ok.set("lang", "zh"); ok.set("website", "");
  assert.deepEqual(readForm(ok), { email: EMAIL, lang: "zh" });
  const bot = new FormData(); bot.set("email", EMAIL); bot.set("lang", "en"); bot.set("website", "spam.example");
  assert.equal(readForm(bot).bot, true);
  const unknownLang = new FormData(); unknownLang.set("email", EMAIL); unknownLang.set("lang", "fr");
  assert.equal(readForm(unknownLang).lang, "en");
});

test("tokens round-trip, and forged, altered or expired tokens fail", async () => {
  const now = Date.UTC(2026, 10, 16, 12);
  const tok = await makeToken(SECRET, { email: EMAIL, lang: "ru" }, now);
  assert.deepEqual(await verifyToken(SECRET, tok, now + 1000), { email: EMAIL, lang: "ru", signedUpAt: new Date(now).toISOString() });
  assert.equal(await verifyToken("other-secret", tok, now), null, "wrong secret");
  assert.equal(await verifyToken(SECRET, tok, now + TOKEN_TTL_MS + 1), null, "expired after 48 hours");
  const [body, sig] = tok.split(".");
  const swapped = btoa(JSON.stringify({ e: "someone.else@example.com", l: "ru", t: now })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(await verifyToken(SECRET, `${swapped}.${sig}`, now), null, "altered email");
  assert.equal(await verifyToken(SECRET, `${body}.${sig}x`, now), null, "altered signature");
  assert.equal(await verifyToken(SECRET, "garbage", now), null);
});

test("confirmation email exists in every language with the same keys", () => {
  const keys = Object.keys(EMAIL_TEXT.en).sort();
  for (const lang of ["es", "zh", "ru"]) assert.deepEqual(Object.keys(EMAIL_TEXT[lang]).sort(), keys, lang);
  const m = confirmationEmail("es", "https://carepayny.com/es/updates/confirm/#t=abc");
  assert.equal(m.subject, EMAIL_TEXT.es.subject);
  assert.ok(m.html.includes("#t=abc") && m.text.includes("#t=abc"));
});

test("subscribe: sends nothing while sign-up is closed", async () => {
  const { res, calls } = await run(() => subscribe({ request: post("/api/subscribe", { email: EMAIL, lang: "en" }), env: { ...ENV, PUBLIC_EMAIL_SIGNUP_OPEN: "" } }));
  assert.equal(calls.length, 0);
  assert.match(res.headers.get("Location"), /\/updates\/\?error=generic/);
});

test("subscribe: sends one confirmation email with a signed #t= link, and logs nothing", async () => {
  const { res, calls, logged } = await run(() => subscribe({ request: post("/api/subscribe", { email: EMAIL, lang: "es", website: "" }), env: ENV }));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), "https://carepayny.com/es/updates/check/");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.deepEqual(calls[0].body.to, [EMAIL]);
  assert.equal(calls[0].body.from, FROM);
  const link = calls[0].body.text.match(/https:\/\/\S+/)[0];
  assert.match(link, /^https:\/\/carepayny\.com\/es\/updates\/confirm\/#t=/);
  assert.ok(await verifyToken(SECRET, decodeURIComponent(link.split("#t=")[1])));
  assert.ok(!logged.some((l) => l.includes(EMAIL)), "email address was logged");
});

test("subscribe: extra fields, bad addresses, honeypot and other sites send nothing", async () => {
  for (const [fields, origin, where] of [
    [{ email: EMAIL, lang: "en", rate: "18.5" }, undefined, "error=generic"],
    [{ email: "not-an-email", lang: "en" }, undefined, "error=email"],
    [{ email: EMAIL, lang: "en", website: "x" }, undefined, "/updates/check/"],
    [{ email: EMAIL, lang: "en" }, "https://evil.example", "error=generic"]
  ]) {
    const { res, calls } = await run(() => subscribe({ request: post("/api/subscribe", fields, origin), env: ENV }));
    assert.equal(calls.length, 0, JSON.stringify(fields));
    assert.ok(res.headers.get("Location").includes(where), `${JSON.stringify(fields)} -> ${res.headers.get("Location")}`);
  }
});

test("confirm: a valid token adds the contact with only email, language and sign-up time", async () => {
  const tok = await makeToken(SECRET, { email: EMAIL, lang: "zh" });
  const { res, calls, logged } = await run(() => confirm({ request: post("/api/confirm", { t: tok, lang: "zh" }), env: ENV }));
  assert.equal(res.headers.get("Location"), "https://carepayny.com/zh/updates/done/");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/contacts");
  assert.deepEqual(Object.keys(calls[0].body).sort(), ["email", "properties", "segments", "unsubscribed"]);
  assert.deepEqual(Object.keys(calls[0].body.properties).sort(), ["language", "signed_up_at"]);
  assert.equal(calls[0].body.email, EMAIL);
  assert.equal(calls[0].body.unsubscribed, false);
  assert.ok(!logged.some((l) => l.includes(EMAIL)));
});

test("confirm: a bad or expired token adds nobody", async () => {
  const old = await makeToken(SECRET, { email: EMAIL, lang: "en" }, Date.now() - TOKEN_TTL_MS - 5000);
  for (const t of [old, "forged.token", ""]) {
    const { res, calls } = await run(() => confirm({ request: post("/api/confirm", { t, lang: "en" }), env: ENV }));
    assert.equal(calls.length, 0);
    assert.match(res.headers.get("Location"), /error=expired/);
  }
});

test("the sign-up page has no calculator inputs", () => {
  const src = readFileSync("src/components/UpdatesPage.astro", "utf8");
  const names = [...src.matchAll(/name="(\w+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual([...new Set(names)], ["email", "lang", "t", "website"]);
  assert.ok(!/Calculator/.test(src.replace(/^\/\/.*$/gm, "")), "the calculator must not be on the sign-up page");
});

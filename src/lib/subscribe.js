// Email updates (test version, docs: project "email-list-plan"): pure helpers shared by
// functions/api/subscribe.js, functions/api/confirm.js and the tests.
// Double opt-in without a database: the confirmation link carries a signed, expiring
// token (HMAC-SHA256). Nothing is stored until the person clicks it.
// Never log an email address anywhere in this flow.

export const LANGS = ["en", "es", "zh", "ru"];
export const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // the link works for 48 hours
export const FORM_FIELDS = ["email", "lang", "website"]; // "website" is the honeypot
export const FROM = "CarePayNY <updates@carepayny.com>";
export const ALLOWED_HOSTS = ["carepayny.com", "www.carepayny.com", "localhost", "127.0.0.1"];

// Local path for a language: ("es", "/updates/check/") -> "/es/updates/check/"
export const pathFor = (lang, path) => (lang === "en" ? path : `/${lang}${path}`);

export function allowedOrigin(request) {
  const origin = request.headers.get("Origin") || request.headers.get("Referer") || "";
  let host = "";
  try { host = new URL(origin).hostname; } catch { return false; }
  return ALLOWED_HOSTS.includes(host) || host.endsWith(".carepayny.pages.dev");
}

// A simple, strict check: one @, a dot in the domain, no spaces, at most 254 characters.
export function normalizeEmail(raw) {
  const email = String(raw ?? "").trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^\s@<>()",;:]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

export const normalizeLang = (raw) => (LANGS.includes(raw) ? raw : "en");

// Reads the posted form. Returns { email, lang, bot } or { error }.
// Any field outside FORM_FIELDS is rejected, so nothing else (never calculator numbers) can ride along.
export function readForm(form) {
  const keys = [...new Set([...form.keys()])];
  const lang = normalizeLang(form.get("lang"));
  if (keys.some((k) => !FORM_FIELDS.includes(k))) return { error: "generic", lang };
  if (String(form.get("website") ?? "") !== "") return { bot: true, lang };
  const email = normalizeEmail(form.get("email"));
  if (!email) return { error: "email", lang };
  return { email, lang };
}

const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return { key, sig: await crypto.subtle.sign("HMAC", key, enc.encode(data)) };
}

// Token = base64url(JSON {e, l, t}) + "." + base64url(HMAC of that part).
export async function makeToken(secret, { email, lang }, now = Date.now()) {
  if (!secret) throw new Error("missing signing secret");
  const body = b64url(enc.encode(JSON.stringify({ e: email, l: lang, t: now })));
  const { sig } = await hmac(secret, body);
  return `${body}.${b64url(sig)}`;
}

// Returns { email, lang, signedUpAt } or null if the token is forged, broken or expired.
export async function verifyToken(secret, token, now = Date.now()) {
  if (!secret || typeof token !== "string" || token.length > 2048) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  try {
    const { key } = await hmac(secret, body);
    const okSig = await crypto.subtle.verify("HMAC", key, unb64url(sig), enc.encode(body));
    if (!okSig) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64url(body)));
    const email = normalizeEmail(p.e);
    if (!email || !LANGS.includes(p.l) || typeof p.t !== "number") return null;
    if (p.t > now + 60_000 || now - p.t > TOKEN_TTL_MS) return null;
    return { email, lang: p.l, signedUpAt: new Date(p.t).toISOString() };
  } catch {
    return null;
  }
}

export const redirect = (url, status = 303) => new Response(null, { status, headers: { Location: url, "Cache-Control": "no-store" } });

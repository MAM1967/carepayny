// Tell Bing (and other IndexNow engines, such as Yandex, Seznam and Naver) which pages changed.
// ChatGPT search draws on Bing's index, so this reaches it too. Google does not use IndexNow;
// it reads the sitemap.
//
// Runs from .github/workflows/indexnow.yml after each push to main:
//   node scripts/indexnow.mjs snapshot          save the live sitemap before Cloudflare deploys
//   node scripts/indexnow.mjs submit            wait for the deploy, then send new or changed URLs
//   node scripts/indexnow.mjs submit --all      send every URL in the sitemap (manual run)
//
// A URL counts as changed when it is new in the sitemap or its <lastmod> moved (a page's
// "last checked" date), or when its Markdown file changed in this push (CHANGED_FILES).
// The key is public by design: IndexNow checks it at https://carepayny.com/<key>.txt.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export const HOST = "carepayny.com";
export const KEY = "494ded82c1f34b71ee6d7a924b19dfe8";
const SITE = `https://${HOST}`;
const OLD = "/tmp/sitemap-before.xml";
const BUILT = "dist/sitemap.xml";

export function parseSitemap(xml) {
  const map = new Map();
  for (const m of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)) map.set(m[1], m[2] ?? "");
  return map;
}

// src/content/<lang>/<section>/<slug>.md -> page URL ("index" is the section's front page).
export function contentFileToUrl(file) {
  const m = /^src\/content\/([a-z]+)\/(.+)\.md$/.exec(file);
  if (!m) return null;
  const slug = m[2].replace(/(^|\/)index$/, "");
  return `${SITE}${m[1] === "en" ? "" : `/${m[1]}`}/${slug}/`;
}

export function changedUrls(oldMap, newMap, changedFiles = []) {
  const out = new Set();
  for (const [loc, lastmod] of newMap) if (!oldMap.has(loc) || oldMap.get(loc) !== lastmod) out.add(loc);
  for (const f of changedFiles) {
    const u = contentFileToUrl(f);
    if (u && newMap.has(u)) out.add(u);
  }
  return [...out];
}

async function get(url) {
  const r = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  return r.ok ? r.text() : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [cmd, flag] = process.argv.slice(2);
  if (cmd === "snapshot") {
    writeFileSync(OLD, (await get(`${SITE}/sitemap.xml?${Date.now()}`)) ?? "");
    return console.log("Saved the live sitemap.");
  }
  if (cmd !== "submit") throw new Error("Use: snapshot | submit [--all]");

  const built = readFileSync(BUILT, "utf8");
  const newMap = parseSitemap(built);

  // Wait (up to 20 minutes) until Cloudflare serves this build's sitemap and the key file.
  let live = false;
  for (let i = 0; i < 40 && !live; i++) {
    const [sm, key] = await Promise.all([get(`${SITE}/sitemap.xml?${Date.now()}`), get(`${SITE}/${KEY}.txt?${Date.now()}`)]);
    live = sm?.trim() === built.trim() && key?.trim() === KEY;
    if (!live) await sleep(30_000);
  }
  if (!live) throw new Error("The deploy did not show up on carepayny.com within 20 minutes. Nothing sent.");

  const files = (process.env.CHANGED_FILES ?? "").split(/\s+/).filter(Boolean);
  const oldMap = flag === "--all" ? new Map() : parseSitemap(existsSync(OLD) ? readFileSync(OLD, "utf8") : "");
  const urls = changedUrls(oldMap, newMap, files);
  if (!urls.length) return console.log("No new or changed pages. Nothing sent.");

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls.slice(0, 10000) })
  });
  console.log(`IndexNow answered ${res.status} for ${urls.length} URL(s):\n${urls.join("\n")}`);
  if (res.status >= 400) process.exit(1);   // 200 and 202 both mean accepted
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });

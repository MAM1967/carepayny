// POST /api/e — anonymous usage events (see src/lib/events.js).
// Accepts only allowlisted categories and writes one data point to
// Cloudflare Workers Analytics Engine (binding EVENTS, dataset "carepayny_events").
// Stores no IP address, no cookie and no user agent. Country, and the U.S. state for
// visitors in the U.S., come from Cloudflare's lookup of the connection (never the IP itself).
import { sanitize, SCHEMA } from "../../src/lib/events.js";

const ALLOWED_HOSTS = ["carepayny.com", "www.carepayny.com", "localhost", "127.0.0.1"];
const ok = () => new Response(null, { status: 204 });

/** Two-letter U.S. state (or DC/PR) from Cloudflare's IP lookup; "" outside the U.S. or if unknown. */
export function usState(cf) {
  if (!cf || cf.country !== "US") return "";
  const code = String(cf.regionCode || "").toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "";
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || request.headers.get("Referer") || "";
  let host = "";
  try { host = new URL(origin).hostname; } catch { /* no origin */ }
  if (!ALLOWED_HOSTS.includes(host) && !host.endsWith(".carepayny.pages.dev")) return ok();

  const text = await request.text();
  if (text.length > 1024) return ok();
  let ev;
  try { ev = sanitize(JSON.parse(text)); } catch { return ok(); }
  if (!ev || !env.EVENTS) return ok();

  // Fixed column order per event type: blob1 = event, blob2.. = its fields in SCHEMA order,
  // then country, then U.S. state (added Nov 21, 2026; empty in earlier rows).
  const fields = Object.keys(SCHEMA[ev.e]);
  const country = (request.cf && request.cf.country) || "XX";
  env.EVENTS.writeDataPoint({
    indexes: [ev.e],
    blobs: [ev.e, ...fields.map((k) => ev[k] ?? ""), country, usState(request.cf)],
    doubles: [1]
  });
  return ok();
}

export const onRequest = () => new Response(null, { status: 405 });

// Anonymous usage events for CarePayNY.
//
// The ONE rule: exact numbers a person types (pay rate, hours, pay stub amount)
// never leave the device. Only the coarse categories below are sent. The same
// allowlist runs in the browser (building events) and on the server (accepting
// them), and tests/events.test.js checks it. Anything not listed is dropped.
//
// Used by: src/components/Calculator.astro, src/layouts/Base.astro (page views),
// src/components/ProgramsPage.astro (phone taps), functions/go/[id].js (map and
// website links) and functions/api/e.js (the endpoint that writes to Cloudflare
// Analytics Engine).

export const EVENT_URL = "/api/e";

const ONE_OF = (...v) => (x) => (v.includes(x) ? x : undefined);
const LANGS = ONE_OF("en", "es", "zh", "ru");
const BOOL = (x) => (x === "y" || x === "n" ? x : undefined);
const FLAG_CODES = ["privateFloor", "shiftsMissed", "shiftsOk", "rateShort", "pplShort", "wageParity", "stubShort", "stubOver", "overtime"];

// Field -> validator. Values are short strings only.
export const SCHEMA = {
  view: {
    lang: LANGS,
    page: (x) => (typeof x === "string" && /^\/[a-z0-9\-/]{0,80}$/.test(x) ? x : undefined),
    returning: BOOL
  },
  calc: {
    lang: LANGS,
    returning: BOOL,
    year: ONE_OF("2026", "2027"),
    region: ONE_OF("nyc", "liw", "rest"),
    employer: ONE_OF("agency", "cdpap", "private"),
    medicaid: ONE_OF("yes", "no", "unsure", "na"),
    livesIn: BOOL,
    shifts24: ONE_OF("0", "1-2", "3-4", "5+"),
    hours: ONE_OF("0-20", "21-40", "41-50", "51-60", "61+"),
    overtime: BOOL,
    status: ONE_OF("ok", "check", "bad"),
    rateGap: ONE_OF("none", "<1", "1-2", "2-3", "3+"),
    wpGap: ONE_OF("na", "none", "<1", "1-2", "2-3", "3+"),
    stub: ONE_OF("none", "match", "short<50", "short50-200", "short200+", "over"),
    flags: (x) => (typeof x === "string" && x.split(",").every((c) => c === "" || FLAG_CODES.includes(c)) ? x : undefined)
  },
  copy: { lang: LANGS, status: ONE_OF("ok", "check", "bad") },
  guide: {
    lang: LANGS,
    target: ONE_OF("directHire", "shifts", "minimum", "ppl", "overtime", "wageParity")
  },
  // A tap on a training program's phone, map or website link (/training/programs/).
  // prog is the program's public id from src/data/training-programs.js. Nothing about the person.
  out: {
    lang: LANGS,
    prog: (x) => (typeof x === "string" && /^[a-z0-9-]{1,64}$/.test(x) ? x : undefined),
    kind: ONE_OF("tel", "map", "web")
  }
};

/** Keep only allowlisted fields with allowed values. Returns null for an unknown event. */
export function sanitize(input) {
  if (!input || typeof input !== "object") return null;
  const spec = SCHEMA[input.e];
  if (!spec) return null;
  const out = { e: input.e };
  for (const [k, check] of Object.entries(spec)) {
    const v = check(input[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// --- Bands: turn exact numbers into coarse ranges, in the browser, before sending.
const band = (n, cuts, labels) => labels[cuts.findIndex((c) => n <= c)] ?? labels.at(-1);
export const hoursBand = (h) => band(h, [20, 40, 50, 60], ["0-20", "21-40", "41-50", "51-60", "61+"]);
export const shiftsBand = (n) => (n <= 0 ? "0" : n <= 2 ? "1-2" : n <= 4 ? "3-4" : "5+");
export const gapBand = (g) => (!(g > 0) ? "none" : g < 1 ? "<1" : g < 2 ? "1-2" : g < 3 ? "2-3" : "3+");
export function stubBand(stub, expected) {
  if (stub == null) return "none";
  const d = expected - stub;
  if (Math.abs(d) < 1) return "match";
  if (d < 0) return "over";
  return d < 50 ? "short<50" : d <= 200 ? "short50-200" : "short200+";
}

/** Build the calc event from the calculator's result. No exact amounts. */
export function calcEvent(r, input, { lang, returning, year }) {
  const flags = r.flags.map((f) => f.code);
  if (r.wp && !r.wp.coveredInCash) flags.push("wageParity");
  if (r.otHours > 0) flags.push("overtime");
  return sanitize({
    e: "calc", lang, returning, year: String(year),
    region: r.region, employer: input.employer,
    medicaid: input.employer === "agency" ? input.medicaid : "na",
    livesIn: input.livesIn ? "y" : "n",
    shifts24: shiftsBand(input.shifts24),
    hours: hoursBand(r.totalHours),
    overtime: r.otHours > 0 ? "y" : "n",
    status: r.status,
    rateGap: gapBand(r.rateShort),
    wpGap: r.wp ? (r.wp.coveredInCash ? "none" : gapBand(r.wp.gapPerHour)) : "na",
    stub: stubBand(r.stub ? r.stub.entered : null, r.expectedGross),
    flags: [...new Set(flags)].filter((c) => FLAG_CODES.includes(c)).sort().join(",")
  });
}

/** Send an event without blocking the page. Never throws. */
export function send(ev) {
  try {
    if (!ev || typeof navigator === "undefined" || !navigator.sendBeacon) return;
    navigator.sendBeacon(EVENT_URL, JSON.stringify(ev));
  } catch { /* counting must never break the page */ }
}

/** "y" if this browser has visited before. Stores only a yes/no marker, no ID. */
export function returningFlag() {
  try {
    // Decide once per page load, so the page view and calculator events agree.
    if (window.__cpReturning) return window.__cpReturning;
    const seen = localStorage.getItem("cp_seen") === "1";
    if (!seen) localStorage.setItem("cp_seen", "1");
    return (window.__cpReturning = seen ? "y" : "n");
  } catch { return undefined; }
}

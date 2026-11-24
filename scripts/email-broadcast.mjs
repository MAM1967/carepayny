#!/usr/bin/env node
// Make an update email from a file in emails/ (see docs/email-updates.md, "Sending an update").
//
//   node scripts/email-broadcast.mjs preview emails/2027-01-new-rates.md
//       Writes email-preview/<name>.html and .txt to look at. Needs nothing set up.
//   node scripts/email-broadcast.mjs draft emails/2027-01-new-rates.md [--dry-run]
//       Creates the email in Resend as a DRAFT broadcast to the "CarePayNY updates" segment.
//       It never sends. The owner reads the draft in Resend and presses Send there.
//       Needs RESEND_API_KEY and RESEND_SEGMENT_ID in the environment, and POSTAL_ADDRESS
//       in src/data/site.js. --dry-run prints what would be sent to Resend instead.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import { renderUpdate } from "../src/lib/update-email.js";
import { POSTAL_ADDRESS } from "../src/data/site.js";
import { FROM } from "../src/lib/subscribe.js";

const [mode, file, ...flags] = process.argv.slice(2);
const usage = () => { console.error("Usage: node scripts/email-broadcast.mjs preview|draft emails/<file>.md [--dry-run]"); process.exit(2); };
if (!["preview", "draft"].includes(mode) || !file) usage();

const name = basename(file, ".md");
const source = readFileSync(file, "utf8");

if (mode === "preview") {
  const email = renderUpdate(source, { postalAddress: POSTAL_ADDRESS });
  mkdirSync("email-preview", { recursive: true });
  writeFileSync(`email-preview/${name}.html`, email.html);
  writeFileSync(`email-preview/${name}.txt`, `Subject: ${email.subject}\n\n${email.text}\n`);
  console.log(`Subject: ${email.subject}\nWrote email-preview/${name}.html and email-preview/${name}.txt`);
  if (!POSTAL_ADDRESS.trim()) console.log("Note: POSTAL_ADDRESS is empty, so the preview shows a placeholder. A draft can't be created until it is set.");
  process.exit(0);
}

// mode === "draft"
let email;
try {
  email = renderUpdate(source, { postalAddress: POSTAL_ADDRESS, strict: true });
} catch (e) {
  console.error(`Stopped: ${e.message}`);
  process.exit(1);
}
const { RESEND_API_KEY, RESEND_SEGMENT_ID } = process.env;
const body = { segment_id: RESEND_SEGMENT_ID || "(RESEND_SEGMENT_ID)", from: FROM, subject: email.subject, html: email.html, text: email.text, name };
if (flags.includes("--dry-run")) {
  console.log(JSON.stringify({ ...body, html: `(${email.html.length} characters)` }, null, 2));
  process.exit(0);
}
if (!RESEND_API_KEY || !RESEND_SEGMENT_ID) {
  console.error("Stopped: set RESEND_API_KEY and RESEND_SEGMENT_ID in the environment first.");
  process.exit(1);
}
// No "send" field: Resend creates a draft. Sending is the owner's step, in the Resend dashboard.
const res = await fetch("https://api.resend.com/broadcasts", {
  method: "POST",
  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
const out = await res.text();
if (!res.ok) { console.error(`Resend said ${res.status}: ${out.slice(0, 300)}`); process.exit(1); }
console.log(`Draft created in Resend (${out}). Open Resend > Broadcasts to read it and send it.`);

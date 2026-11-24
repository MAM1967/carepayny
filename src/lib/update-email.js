// Update emails (broadcasts) for the CarePayNY email list. See docs/email-updates.md.
//
// An update is a Markdown file in emails/ with front matter:
//   subject:   the email subject (English)
//   preheader: one short line shown after the subject in the inbox
//   page:      the site page the update is about, e.g. /pay/minimum-wage-2027/ (links to it in es/zh/ru go on top)
// The body is short Markdown: paragraphs, "## " headings, "- " lists, **bold** and [links](/path/).
// Pay figures are {{tokens}} from src/data/rules.js (CLAUDE.md rule 2), filled in here.
//
// Every email gets: links to the same page in Spanish, Chinese and Russian; a footer that says why the
// reader gets it; Resend's unsubscribe link; the postal address (CAN-SPAM); and no tracking.
import { fillTokens } from "./tokens.js";
import { EMAIL_TEXT } from "../i18n/email.js";

export const SITE = "https://carepayny.com";
export const UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";
const LANGS = ["es", "zh", "ru"];
const ADDRESS_MISSING = "[POSTAL ADDRESS GOES HERE: set POSTAL_ADDRESS in src/data/site.js]";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (url) => (url.startsWith("/") ? SITE + url : url);

/** Split "---\nkey: value\n---\nbody" into { data, body }. Values may be "quoted". */
export function parseUpdate(source) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!m) throw new Error("Update file needs front matter between --- lines");
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^(\w+):\s*(.*)$/.exec(line.trim());
    if (kv) data[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1");
  }
  for (const k of ["subject", "preheader", "page"]) if (!data[k]) throw new Error(`Update front matter is missing "${k}"`);
  return { data, body: m[2].trim() };
}

// Inline Markdown: escape first, then **bold** and [text](url). Links become absolute.
function inlineHtml(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${esc(abs(u.replace(/&amp;/g, "&")))}" style="color:#1d4ed8">${t}</a>`);
}
const inlineText = (text) => text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `${t} (${abs(u)})`);

/** Very small Markdown renderer for update emails (blocks separated by blank lines). */
export function markdownToEmail(md) {
  const html = [];
  const text = [];
  for (const block of md.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines[0].startsWith("## ")) {
      const h = lines[0].slice(3);
      html.push(`<h2 style="font-size:18px;margin:24px 0 8px">${inlineHtml(h)}</h2>`);
      text.push(inlineText(h).toUpperCase());
      lines.shift();
      if (!lines.length) continue;
    }
    if (lines.every((l) => l.startsWith("- "))) {
      html.push(`<ul style="padding-left:20px">${lines.map((l) => `<li style="margin:4px 0">${inlineHtml(l.slice(2))}</li>`).join("")}</ul>`);
      text.push(lines.map((l) => `- ${inlineText(l.slice(2))}`).join("\n"));
    } else {
      const p = lines.join(" ");
      html.push(`<p>${inlineHtml(p)}</p>`);
      text.push(inlineText(p));
    }
  }
  return { html: html.join("\n"), text: text.join("\n\n") };
}

const localized = (lang, page) => `${SITE}/${lang}${page}`;

/**
 * Build one update email. With strict: true (used before creating a broadcast), it refuses to
 * build without a postal address. Without strict (previews), it shows a placeholder instead.
 */
export function renderUpdate(source, { postalAddress = "", strict = false } = {}) {
  if (strict && !postalAddress.trim()) throw new Error("POSTAL_ADDRESS is empty in src/data/site.js. Add it before creating a broadcast (CAN-SPAM).");
  const { data, body } = parseUpdate(fillTokens(source, "emails/update.md"));
  if (/\{\{(?!\{)/.test(body)) throw new Error("Unfilled {{token}} left in the update");
  const content = markdownToEmail(body);
  const address = postalAddress.trim() || ADDRESS_MISSING;
  const langLinksHtml = LANGS.map((l) => `<a href="${localized(l, data.page)}" style="color:#1d4ed8">${esc(EMAIL_TEXT[l].readIn)}</a>`).join(" · ");
  const langLinksText = LANGS.map((l) => `${EMAIL_TEXT[l].readIn}: ${localized(l, data.page)}`).join("\n");
  const why = "You get this email because you signed up for free CarePayNY email updates and confirmed it.";
  const independent = EMAIL_TEXT.en.footer;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(data.subject)}</title></head>
<body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#111;max-width:600px;margin:0 auto;padding:16px">
<div style="display:none;max-height:0;overflow:hidden">${esc(data.preheader)}</div>
<p style="font-size:14px">${langLinksHtml}</p>
${content.html}
<hr style="border:0;border-top:1px solid #ddd;margin:24px 0">
<p style="font-size:13px;color:#555">${esc(why)} <a href="${UNSUBSCRIBE}" style="color:#555">Unsubscribe</a> (one click stops the emails).</p>
<p style="font-size:13px;color:#555">${esc(independent)}</p>
<p style="font-size:13px;color:#555">${esc(address)}</p>
</body></html>`;
  const text = [langLinksText, "", content.text, "", "---", `${why} Unsubscribe: ${UNSUBSCRIBE}`, independent, address].join("\n");
  return { subject: data.subject, preheader: data.preheader, page: data.page, html, text };
}

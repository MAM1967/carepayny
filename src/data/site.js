// While LAUNCHED is false, every page is marked noindex and robots.txt blocks crawlers.
export const LAUNCHED = true;
// Cloudflare Web Analytics site token. The beacon is cookieless and counts page views only.
// It is added to every page EXCEPT the calculator pages (site rule 5). Set to "" to turn it off.
export const CF_ANALYTICS_TOKEN = "f82f0497d0be452293e1c8b49ceb8072";
export const CONTACT_EMAIL = "hello@carepayny.com";

// Email updates (test version). Off until the owner sets PUBLIC_EMAIL_SIGNUP_OPEN = "true"
// in Cloudflare Pages (Preview first, then Production) after the Resend setup is done.
// While off: no sign-up form, no links to /updates/, and /updates/ pages are noindex.
// Read safely so Node tests (no import.meta.env) see "off".
export const EMAIL_SIGNUP_OPEN = (import.meta.env?.PUBLIC_EMAIL_SIGNUP_OPEN ?? "") === "true";
// The email service named on the Privacy page.
export const EMAIL_PROVIDER = { name: "Resend", privacyUrl: "https://resend.com/legal/privacy-policy" };
// Postal address printed at the bottom of every update email (CAN-SPAM). It is needed only before an
// update email is SENT, not to open sign-up. scripts/email-broadcast.mjs refuses to create a broadcast
// while this is empty. Example: "MAM Growth Strategies LLC, 123 Main St, Suite 4, Albany, NY 12207".
export const POSTAL_ADDRESS = "";

// Who runs the site, as named on the Terms and Privacy pages.
export const OPERATOR = "MAM Growth Strategies LLC";

// Date the Terms and Privacy pages last changed. Update it with every edit.
export const LEGAL_UPDATED = "November 26, 2026";

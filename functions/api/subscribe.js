// POST /api/subscribe — step 1 of the email updates sign-up (double opt-in).
// Takes only an email address and the page language. Sends ONE confirmation email
// through Resend with a signed link that works for 48 hours. Stores nothing.
// Never logs the address. See src/lib/subscribe.js.
//
// Settings (Cloudflare Pages > Settings > Variables and secrets):
//   PUBLIC_EMAIL_SIGNUP_OPEN = "true"  (also shows the form at build time)
//   RESEND_API_KEY  (secret)   SIGNING_SECRET (secret, long random string)
import { readForm, makeToken, allowedOrigin, pathFor, redirect, FROM } from "../../src/lib/subscribe.js";
import { confirmationEmail } from "../../src/i18n/email.js";

export async function onRequestPost({ request, env }) {
  const site = new URL(request.url).origin;
  let lang = "en";
  const back = (error) => redirect(`${site}${pathFor(lang, "/updates/")}?error=${error}#signup`);
  try {
    if (env.PUBLIC_EMAIL_SIGNUP_OPEN !== "true" || !env.RESEND_API_KEY || !env.SIGNING_SECRET) return back("generic");
    if (!allowedOrigin(request)) return back("generic");
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 2048) return back("generic");

    const form = await request.formData();
    const r = readForm(form);
    lang = r.lang;
    if (r.error) return back(r.error);
    const check = redirect(`${site}${pathFor(lang, "/updates/check/")}`);
    if (r.bot) return check; // honeypot filled: act normal, send nothing

    const token = await makeToken(env.SIGNING_SECRET, { email: r.email, lang });
    // The token goes after "#", so it is never sent to a server or kept in any request log.
    const confirmUrl = `${site}${pathFor(lang, "/updates/confirm/")}#t=${encodeURIComponent(token)}`;
    const { subject, html, text } = confirmationEmail(lang, confirmUrl);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [r.email], subject, html, text, tags: [{ name: "kind", value: "confirm" }] })
    });
    if (!res.ok) return back("generic");
    return check;
  } catch {
    return back("generic");
  }
}

export const onRequest = () => new Response(null, { status: 405 });

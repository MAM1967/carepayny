// POST /api/confirm — step 2 of the email updates sign-up (double opt-in).
// The confirmation email links to /updates/confirm/#t=… (after "#", so it never reaches a server log), a page with a button that
// posts the token here. (A button, not the link itself, so email security scanners
// that open links can't confirm for someone.)
// Checks the signed token, then adds the contact in Resend with only:
// email, language and sign-up time (plus Resend's own created date = confirmation time).
// Never logs the address. See src/lib/subscribe.js.
//
// Settings: PUBLIC_EMAIL_SIGNUP_OPEN, RESEND_API_KEY, SIGNING_SECRET, RESEND_SEGMENT_ID (optional).
import { verifyToken, allowedOrigin, pathFor, redirect, normalizeLang } from "../../src/lib/subscribe.js";

const API = "https://api.resend.com";

export async function onRequestPost({ request, env }) {
  const site = new URL(request.url).origin;
  let lang = "en";
  const back = (error) => redirect(`${site}${pathFor(lang, "/updates/")}?error=${error}#signup`);
  try {
    if (env.PUBLIC_EMAIL_SIGNUP_OPEN !== "true" || !env.RESEND_API_KEY || !env.SIGNING_SECRET) return back("generic");
    if (!allowedOrigin(request)) return back("generic");
    const form = await request.formData();
    lang = normalizeLang(form.get("lang"));
    const v = await verifyToken(env.SIGNING_SECRET, String(form.get("t") ?? ""));
    if (!v) return back("expired");
    lang = v.lang;

    const headers = { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" };
    const properties = { language: v.lang, signed_up_at: v.signedUpAt };
    const segments = env.RESEND_SEGMENT_ID ? [{ id: env.RESEND_SEGMENT_ID }] : undefined;
    let res = await fetch(`${API}/contacts`, {
      method: "POST", headers,
      body: JSON.stringify({ email: v.email, unsubscribed: false, properties, segments })
    });
    if (!res.ok) {
      // Already a contact (for example, signed up before and stopped): turn the emails back on.
      const id = encodeURIComponent(v.email);
      res = await fetch(`${API}/contacts/${id}`, { method: "PATCH", headers, body: JSON.stringify({ unsubscribed: false, properties }) });
      if (res.ok && env.RESEND_SEGMENT_ID) {
        await fetch(`${API}/contacts/${id}/segments/${encodeURIComponent(env.RESEND_SEGMENT_ID)}`, { method: "POST", headers });
      }
    }
    if (!res.ok) return back("generic");
    return redirect(`${site}${pathFor(lang, "/updates/done/")}`);
  } catch {
    return back("generic");
  }
}

export const onRequest = () => new Response(null, { status: 405 });

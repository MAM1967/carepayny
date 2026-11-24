# Email updates (test version)

Approved by the owner on November 16, 2026. Full plan: Claude project doc `claude/email-list-plan.md`.

The test runs on Resend's free Marketing plan (up to 1,000 contacts) plus the existing Transactional plan. It uses one list and one segment, with no language segments and no topics. Each contact stores `language` and `signed_up_at`. Emails are in English, with links to the same update on the site in Spanish, Chinese and Russian.

**Success check:** about 100 confirmed subscribers within 60 days of opening.

## How sign-up works

1. `/updates/` (each language) has a form with only an email address. There is also a hidden honeypot field, and the language comes from the page.
2. `POST /api/subscribe` (`functions/api/subscribe.js`) checks the input and sends **one** confirmation email through Resend.
   - The email holds a signed link: `/updates/confirm/#t=…` (HMAC-SHA256, valid for 48 hours).
   - Nothing is stored at this step.
   - The token sits after `#`, so it never reaches a server log.
3. `/updates/confirm/` shows a **Confirm** button. A person has to press it, so email link scanners can't confirm for someone. The button posts the token to `POST /api/confirm`.
4. `functions/api/confirm.js` checks the token and creates the Resend contact. The contact gets `unsubscribed: false`, the properties `language` and `signed_up_at`, and the segment if one is set.
5. The person lands on `/updates/done/`.

Rules:

- No email address is ever logged.
- Any form field other than `email`, `lang` and `website` (the honeypot) is rejected.
- `tests/subscribe.test.js` proves these rules.

## What is already built (no Resend setup needed)

- Sign-up form, confirmation email, confirm page and done page, in 4 languages (switched off).
- Sign-up prompts, shown only once sign-up is on: the footer of every page, the bottom of every guide page, and under the calculator result.
- A count of confirmed sign-ups for the weekly report: `/api/confirm` writes one `signup` row to Analytics Engine (`carepayny_events`) with only the page language, country and U.S. state. Never the email address. The Privacy page lists it.
- Update emails: Markdown files in `emails/`, built by `src/lib/update-email.js` into HTML and plain text. Pay figures are `{{tokens}}` from `rules.js`. Each email links to the same page in Spanish, Chinese and Russian, says why the reader gets it, has Resend's unsubscribe link and the postal address, and has no images or tracking.
- The first update is drafted: `emails/2027-01-new-rates.md` ("New home care pay rates start January 1, 2027").
- `scripts/email-broadcast.mjs` makes a preview, or creates a **draft** broadcast in Resend. It never sends.

## Turning it on (owner steps, about 25 minutes)

Do these on **Preview** first, test once, then repeat for **Production**.

1. **Resend > Domains:** check that `carepayny.com` is verified, or add it and put its DNS records in Cloudflare. Check that open and click tracking are **off** for the domain.
2. **Resend > Audience:**
   - Create one segment, "CarePayNY updates", and copy its ID.
   - Create two contact properties, both of type string: `language` and `signed_up_at`.
3. **Resend > API keys:** create a key with full access, limited to the `carepayny.com` domain if offered.
4. **Cloudflare > Workers & Pages > carepayny > Settings > Variables and secrets** (Preview environment first):
   - `PUBLIC_EMAIL_SIGNUP_OPEN` = `true` (plain text; it also turns on the form and the sign-up prompts at build time)
   - `RESEND_API_KEY` = the key (secret)
   - `SIGNING_SECRET` = a long random string (secret)
   - `RESEND_SEGMENT_ID` = the segment ID
5. **Optional:** add a Cloudflare rate-limiting rule for `/api/subscribe` (for example, 5 requests per minute per IP).
6. Redeploy, sign up with your own address on the preview site, and confirm it.
7. When it works, set the same variables for Production and redeploy.

## Sending an update

The postal address is needed only here, before an email goes out, not to open sign-up.

1. **Postal address (once):** set `POSTAL_ADDRESS` in `src/data/site.js` (CAN-SPAM requires one in commercial email). The draft step refuses to run while it is empty.
2. **Write or update the email** in `emails/`. Use `{{tokens}}` for every pay figure. Describe, don't direct.
3. **Preview:** `node scripts/email-broadcast.mjs preview emails/<file>.md` writes `email-preview/<file>.html` and `.txt` (not committed).
4. **Draft in Resend:** `RESEND_API_KEY=… RESEND_SEGMENT_ID=… node scripts/email-broadcast.mjs draft emails/<file>.md`. Add `--dry-run` first to see what would be sent to Resend. The script creates a draft only.
5. **Owner approves and sends** in Resend > Broadcasts. The owner approves every send.

Every broadcast includes `{{{RESEND_UNSUBSCRIBE_URL}}}`; the email builder adds it.

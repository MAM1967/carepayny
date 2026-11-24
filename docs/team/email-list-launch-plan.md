# Plan: open the email list (item 4)

Status: planned November 24, 2026. **Update, same day: every step that doesn't need Resend is built** (PR "Email list: everything that doesn't need Resend"): steps 9, 10 (count source), 11, and the send tooling. What's left is Resend + Cloudflare setup (steps 1–8) and the postal address before the first send (step 12). Owner approval needed at the steps marked **Owner**.
Background: the list was approved as a $0 test on November 16, 2026, and built in PR #33 (switched off). How it works and the setup steps: `docs/email-updates.md`.

## Why now

The 90-day gate asks for 500 subscribers. Today there are none, because sign-up is off. The January 1, 2027 raise is the best reason to sign up this winter ("get an email when the rates change"). The goal is to open sign-up **by December 1, 2026**, so it catches December searches for the 2027 rates.

## Success checks

- The test's own check: about 100 confirmed subscribers within 60 days of opening (owner-approved).
- Gate target: 500 subscribers by day 90. That is a stretch; the weekly report tracks progress.

## Steps

| # | Step | Who | Done when |
| --- | --- | --- | --- |
| 1 | Resend: verify `carepayny.com` (DNS records in Cloudflare); open and click tracking **off** | **Owner** (~10 min) | Domain shows "Verified" |
| 2 | Resend: create the segment "CarePayNY updates" and the string properties `language` and `signed_up_at` | **Owner** (~5 min) | Segment ID copied |
| 3 | Resend: create an API key limited to `carepayny.com` | **Owner** (~2 min) | Key copied |
| 4 | Cloudflare Pages, **Preview** environment: set `PUBLIC_EMAIL_SIGNUP_OPEN=true`, `RESEND_API_KEY`, `SIGNING_SECRET`, `RESEND_SEGMENT_ID` | **Owner** (~5 min) | Variables saved |
| 5 | Optional: rate-limit rule for `/api/subscribe` (5 requests a minute per IP) | **Owner** (~3 min) | Rule active |
| 6 | QA on the preview build: sign up in all 4 languages, check the confirmation email, Confirm button, the contact in Resend with `language` and `signed_up_at`, honeypot, expired link, bad email; confirm no email address appears in logs; `tests/subscribe.test.js` passes | QA agent + owner's test address | PASS report |
| 7 | Privacy review: `/privacy/` "Email updates" section matches what the system stores (email, language, sign-up date; no open or click tracking); remove "Sign-up is not open yet" happens automatically | Security agent (review only) | Review notes; any wording change goes in a PR |
| 8 | Production: set the same variables, redeploy | **Owner** | `/updates/` form is live |
| 9 | Sign-up prompts where intent is highest (one small PR, 4 languages): a line under the calculator result and on `/pay/minimum-wage-2027/` ("Get a free email when the rates change"), alongside the existing footer and guide-page prompts. Describe, don't direct; no pop-ups | Frontend + translators | PR merged by owner |
| 10 | Weekly report: add confirmed subscribers, sign-ups by language and unsubscribes (no opens or clicks) | Lead (report change needs owner OK in a live chat) | Report shows the numbers |
| 11 | First update email draft: "New home care pay rates start January 1, 2027" (English, with links to the es/zh/ru pages) | Writer | Draft ready for owner review |
| 12 | Postal address for the email footer (CAN-SPAM): set `POSTAL_ADDRESS` in `src/data/site.js`. Needed only before the first email is sent, not to open sign-up | **Owner decision** | Address added; `scripts/email-broadcast.mjs draft` refuses to run until it is |
| 13 | Send the first email after the owner approves the text | **Owner** | Sent |

## Open decision for the owner (step 12)

To send the January 1 email on time, the footer needs a postal address by about December 28. Options:

- the LLC's existing business or registered address (no new cost),
- a P.O. box or virtual mailbox (monthly cost: needs approval and a line in `COST_LOG.md`),
- wait and send no update emails until later (sign-up can still open; people just won't get the January email).

## Risks and guardrails

- Spam sign-ups: honeypot, confirm button, optional rate limit (step 5).
- Privacy promise: no open or click tracking; emails never logged; typed calculator numbers never connected to an email.
- Cost: stays $0 on Resend's free Marketing plan up to 1,000 contacts. Moving past that (Pro Marketing, $40/month) needs owner approval.
- Rule 4: emails describe rule changes and link to pages; they never tell a reader what to do.

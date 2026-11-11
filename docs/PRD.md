# CarePayNY — Product Requirements

Draft v1 · November 9, 2026 · Owner: Michael McDermott
Editable source: https://claude.ai/artifact/EYAjfj7o9y6rn72jpFqyH1 (this file is the copy agents read; keep them in sync)

## Overview

We will build a free, multilingual website that helps New York City home care workers check whether they are paid correctly, fix CDPAP payroll problems and find their next job. The free tools bring in traffic; job listings and agency placements earn the money later.

**Problem.** New York has the most complex home care pay rules in the country. They layer a home care aide minimum wage, a downstate wage parity supplement for Medicaid work and the 13-hour rule for 24-hour shifts. Workers can't check their own pay. The calculators that exist are payroll software sold to employers. Salary sites show wrong figures; one lists a $10.50 average for NYC aides, about half the legal minimum.

**Opportunity.** About 75% of caregivers leave their jobs each year, so agencies are always hiring. Meanwhile an estimated 425,000 CDPAP caregivers statewide are dealing with PPL payroll problems, and their main help today is Facebook groups. A worker-side tool that checks pay against the rules does not appear to exist.

**Product.** Free, no-ad pay calculator → CDPAP payroll guide → training finder and alerts → NYC job listings.

**Name.** CarePayNY, at carepayny.com. A .com needs no NYC address, allows privacy protection, and the "NY" covers Long Island, Westchester and the rest of the state. carepayny.com and carepayny.org were bought on November 9, 2026; ownership moves to the LLC once it is formed. Most past "CarePay" trademarks are dead; a live "CarePayment" mark covers healthcare financing, so a quick lawyer clearance comes before any branding spend.

## Goals, non-goals and success metrics

The first 90 days test one thing: do NYC caregivers use the calculator and come back? Revenue comes after that test passes.

**Goals**

1. Become the most accurate free source of NY home care pay rules, in the languages caregivers speak.
2. Build a returning audience. Pay periods, rate changes and CDPAP problems give people a reason to come back.
3. Reach enough traffic to qualify for job-ad networks such as Talroo, then add agency revenue.

**Non-goals**

- Legal advice, claim filing or one-on-one counseling.
- Collecting or storing wage or health data from calculator users.
- Ads on the calculator page.
- Mass-produced AI pages to chase search rankings.
- Coverage outside NYC, Long Island and Westchester before month 9.

**Day-90 go/no-go gate** (targets to confirm before launch)

| Metric | Target by day 90 | Why it matters |
| --- | --- | --- |
| Monthly visitors | 5,000 | Enough for a Talroo publisher application |
| Calculator completions per month | 1,000 | Proof the core tool is used |
| Email or text subscribers | 500 | The asset that brings people back |
| Returning-visitor share | 25% | Proof of a reason to come back |
| Reported calculation errors left open | 0 | Accuracy is the brand |

If the gate is missed, cut scope back to the calculator and CDPAP guide, or stop. Do not add monetization to a site nobody returns to.

## Users and personas

The primary user is a home care worker in the NYC metro area on a phone, often with limited English and limited time. Design for a small screen, plain words and one task per page.

| Persona | Situation | Top questions | What brings them back |
| --- | --- | --- | --- |
| Agency home health aide | Paid by a licensed agency, mostly Medicaid cases, may work 24-hour shifts | Is my rate legal? Am I owed wage parity? Should 24-hour shifts pay 13 hours? | Every payday; January 1 rate changes |
| CDPAP caregiver | Family member or friend paid through PPL | Why wasn't I paid? What does this payroll hold mean? How does overtime work? | Each payroll problem; PPL changes |
| New entrant | Wants to become an aide, needs the 75-hour home health aide course | Where is free training near me, and in my language? | Course start dates; certification reminders |
| Job switcher | Experienced aide looking for better pay or hours | Which agencies pay more? Who is hiring near me? | Job alerts |

**Languages.** Launch in English and Spanish. Then add Chinese, Russian, Haitian Creole and Bengali, in an order set by how much traffic and how many requests each gets. Each translation is checked by a paid native speaker before it goes live.

**Secondary users.** Families who manage CDPAP for a relative, and advocates or union reps who share the calculator with workers.

## Scope and features

Launch with the calculator and the CDPAP guide. Everything else waits until there is a returning audience.

| Feature | Phase | Priority | What it does |
| --- | --- | --- | --- |
| Pay calculator | 1 | Must | Checks one week of pay against NY rules. Free, no ads, nothing stored. Built (`src/pages/index.astro`). |
| 2026 pay rules explainer | 1 | Must | Plain-language pages on the minimum wage, wage parity, overtime and 24-hour shifts |
| CDPAP payroll guide | 1 | Must | One page per payment problem: symptom, cause, fix and who to contact |
| Spanish versions | 1 | Must | Calculator and guide, checked by a native speaker |
| Email and text alerts | 2 | Must | Payday reminders, rate changes, CDPAP notices, certification lapse reminders |
| Free training finder | 2 | Should | NYS-approved 75-hour home health aide and 40-hour personal care aide courses, by borough and language, with start dates |
| More languages | 2 | Should | Chinese, Russian, Haitian Creole, Bengali |
| NYC job listings | 2–3 | Should | Job-ad network feed on job pages only, after traffic qualifies |
| Featured agency listings | 3 | Could | Flat monthly fee for placement on job pages; needs legal review first |
| Agency report cards | 3 | Could | Pay rates and public court records, plus verified reviews; needs legal review first |
| Long Island, Westchester, New Jersey | 4 | Could | Expansion after NYC works |

## Pay calculator requirements

The calculator checks one week of pay against New York's 2026 rules entirely in the browser and gives a three-level verdict: looks right, worth checking, or may be underpaid.

**Inputs**

| Input | Values | Notes |
| --- | --- | --- |
| Work region | NYC; Nassau, Suffolk or Westchester; rest of NY | Sets the minimum wage and wage parity amounts |
| Who pays you | Home care agency; CDPAP through PPL; family hires me directly | CDPAP counts as Medicaid; direct hire counts as non-Medicaid |
| Medicaid-funded client | Yes; no; not sure | Asked only for agency work |
| Hourly rate | Dollars | Required |
| Regular hours | Hours | Excludes 24-hour shifts |
| 24-hour shifts | Count, 0–7 | Plus the number of shifts where sleep or meal breaks were missed |
| Lives in client's home | Yes or no | Changes the overtime threshold for direct hires only |
| Pay stub gross | Dollars, optional | Compared to expected pay |

**2026 rules** (kept in `src/data/rules.js` with the effective date and source of each figure)

| Rule | NYC | Nassau, Suffolk, Westchester | Rest of NY |
| --- | --- | --- | --- |
| Home care aide minimum wage | $19.65 | $19.65 | $18.65 |
| General minimum wage (direct hires) | $17.00 | $17.00 | $16.00 |
| Wage parity benefit (Medicaid work) | $2.54 | $1.67 | n/a |
| Wage parity total compensation | $22.19 | $21.32 | n/a |

**Logic** (implemented in `src/lib/calc.js`)

1. Applicable minimum = home care aide minimum for agency and CDPAP work; general minimum for direct hires, with a note on the uncertainty.
2. A 24-hour shift counts as 13 paid hours. Add 8 hours if the aide didn't get 8 hours for sleep with 5 uninterrupted, and 3 hours if they didn't get 3 hours of meal breaks.
3. Overtime = 1.5 × the rate after 40 hours, or after 44 hours for a direct hire who lives in the home.
4. Wage parity applies to Medicaid agency and CDPAP work downstate. Required benefit per hour = total compensation minus the cash rate, if that is positive.
5. Pay stub check = expected gross minus stub gross. More than $1 short triggers an underpaid flag.

**Outputs.** A verdict banner, a line-by-line breakdown, plain-language flags with the reason for each, a Copy summary button, and descriptive links to agency payroll, PPL, Legal Aid and the NYS Department of Labor (what each one does, not an instruction to contact them).

**Acceptance**

- [ ] All worked examples pass on every change to the rules (`npm test`, run in CI).
- [ ] An employment lawyer signs off on 20 worked examples before public launch.
- [ ] No input leaves the browser: no analytics on field values, no network calls.
- [ ] Usable on a 360 px wide phone screen and with a screen reader.
- [ ] The 2027 rules are loaded and tested before January 1, 2027.

## CDPAP guide and content

The site launches with about 30 pages, each answering one question a caregiver actually searches. No page goes live without a human approving it.

**CDPAP guide structure**

- A main page: what CDPAP is, how PPL pays, the pay schedule, and where to get help.
- One page per payment problem, built from the causes PPL itself publishes: incomplete registration, missing I-9 documents, the health plan not having sent the authorization for the patient's hours, late timesheets, and a payment different from the hours submitted. Each page covers the symptom, the likely cause, the fix and who to contact.
- Overtime and holiday pay under CDPAP.
- A "what changed" log of PPL and Department of Health notices, newest first.

**Site map at launch**

| Section | Example pages |
| --- | --- |
| Pay check | Calculator; 2026 NY home care pay rules; wage parity explained; 24-hour shifts and the 13-hour rule; overtime |
| CDPAP | Main guide; one page per payment problem; overtime and holidays; what changed |
| Get help | Legal Aid and Department of Labor wage claims; your rights to pay notices |
| About | Who we are; how we check the rules; corrections log; terms; privacy |

**Content standards**

- Every page shows a "last checked" date and links to the official sources.
- Written at a 6th-grade reading level, short sentences, no legal jargon without a definition.
- Gives general information, never individual advice or directions: describes what the rules say and what options exist, never tells people what to do with their results (no "you should," no "contact a lawyer").
- Reported errors are fixed and logged publicly within 48 hours.
- The English version controls when a translation differs, and every translated page says so.

## Translation plan

Every page must be easy to read in every language we offer, not just in English. We use the standard method for website translation (called "internationalization" or "i18n"): every piece of text has a key, and each language has its own copy of the text for that key. **Weblate** is the tool that manages the work.

**Two kinds of text**

| Kind | Examples | How it is stored | How Weblate shows it |
| --- | --- | --- | --- |
| Short text | Buttons, labels, calculator notes, menus, error messages | One file per language in `src/i18n/` (for example `en.json`, `es.json`). Each line is a key and its text, like `copy.done = "Copied."` | One line at a time |
| Long text | Guide pages, the about page, terms and privacy | One Markdown file per page per language, for example `src/content/en/cdpap/basics.md` and `src/content/es/cdpap/basics.md` | One paragraph at a time |

- Short text uses **ICU MessageFormat**. It handles plurals and values that change, so "1 hour" and "5 hours" read right in every language.
- **Numbers are never typed by translators.** Pay rates come only from `src/data/rules.js`. Code formats money and dates for each language.
- English is the source. Translators never change the meaning, only the words.

**Tools that keep translations consistent**

- **Glossary (word list).** Kept in Weblate for each language.
  - Never translated: CarePayNY, PPL, CDPAP, Time4Care, PPL@Home, I-9, W-4.
  - One approved translation each: wage parity, personal assistant, consumer, service authorization, overtime, fiscal intermediary, designated representative, health plan.
- **Translation memory.** Weblate saves every approved sentence. When the same sentence comes up again, it reuses it. This keeps wording the same across pages and lowers cost.
- **Quality checks.** Weblate flags missing values (like `{rate}`), broken links, wrong punctuation and glossary words that weren't used.

**How a page gets translated**

1. The English page is approved and merged.
2. Weblate sees the new or changed text in the repository.
3. A machine draft is made for each paragraph. It is marked "needs editing." It is never published as is.
4. A paid native speaker edits the draft. They check meaning, the glossary and a 6th-grade reading level in their language.
5. The reviewer marks it "approved."
6. Weblate opens a pull request. The owner merges it, and Cloudflare publishes it.
7. A page goes live in a language only when all of it is approved. Until then, that language links to the English page. We do not publish half-translated pages.

**When the English changes**

- Weblate marks the changed paragraphs "needs editing" in every language.
- Pay numbers update by themselves, because they come from the rules file.
- Changes to pay rules or legal wording go to the reviewers first. The goal is an updated translation within 7 days. Until it is done, the translated page shows a note that the English page is newer, with a link to it.

**Web addresses and search engines (SEO and AEO)**

- Each language has its own address: `/` for English, `/es/` for Spanish, then `/zh/`, `/ru/`, `/ht/` and `/bn/`. Language codes follow the BCP 47 standard.
- Each page lists all its language versions with `hreflang` tags, plus an `x-default` tag pointing to English.
- Page titles, descriptions and the sitemap are translated too.
- Every translated page has a "last checked" date and says: "This page was translated from English. If they are different, the English page is correct."

**Order of languages**

Spanish at launch. Then Chinese (Simplified), Russian, Haitian Creole and Bengali. The order after Spanish is set by traffic and requests.

**Weblate setup**

- Connect Weblate to the GitHub repository. Weblate opens pull requests only. It never pushes to `main`.
- Create two parts in Weblate: "site text" (the JSON files) and "pages" (the Markdown files).
- Load the glossary for Spanish before the first page goes in.
- Give each reviewer an account with the "reviewer" role for their language only.
- Turn on a machine translation service for drafts only.

**Acceptance**

- [ ] No text in the site's code is outside the language files. The build fails if a page uses a key that doesn't exist.
- [ ] Spanish calculator and CDPAP pages 1, 2 and 4 to 8 are approved by a native speaker before launch.
- [ ] `hreflang` tags are correct on every page (checked by a test).
- [ ] Every translated page shows the "English is correct" note and a "last checked" date.

## Job requirements and training referrals

The site will explain step by step what it takes to work as a home care aide in New York. That brings in new entrants before they pick a school, and it creates the pages where training programs can later advertise.

**What NY requires to work for a licensed home care agency**

| Requirement | What it involves |
| --- | --- |
| Training | Home health aide: at least 75 hours (59 classroom, 16 supervised practical) in a NYS Department of Health-approved program, finished within 60 days. Personal care aide: 40 hours. |
| Competency test | Written and skills evaluation after training, outside the 75 hours |
| Home Care Worker Registry | Graduates are listed on the state registry; agencies verify it at hire |
| Criminal history record check | Fingerprint-based state and FBI check, run by the hiring agency through the Department of Health |
| Health assessment | Before any patient care, including a TB test, then an annual assessment |
| Identity and work authorization | Standard employment verification (Form I-9) at hire |
| Staying certified | 12 hours of in-service training a year; certification lapses 2 years after the last day worked for a NY home health agency |

**Content pages**

- How to become a home health aide in New York, step by step.
- Home health aide vs personal care aide vs CNA: training, pay and where each can work.
- Free vs paid training: agency programs, CUNY and community colleges, nonprofits.
- What to expect from the background check, linking to legal help for people with records.
- My certification lapsed: how to get back on the registry.
- Whether CDPAP caregivers need certification (to be confirmed before publishing).

**Training directory requirements**

- [ ] List only Department of Health-approved programs, each with the date its approval was last checked.
- [ ] Filters for borough, language, cost (free or paid) and next start date.
- [ ] Disclose when a "free" course requires working for the agency that runs it.
- [ ] Never promise a job; schools' placement claims shown only with a source.
- [ ] Label every paid placement "Sponsored."
- [ ] An inquiry form sends a person's contact details to a school only with their explicit consent. This is the first personal data beyond the email list, so the privacy policy must cover it.

**Future revenue from schools.** Featured directory placement, ads on training pages, or a fixed fee per inquiry. Never charge per enrollment or per hire. For agency-run training, any fee tied to trainees who become employees raises the NYC employment agency license question, so it waits for legal sign-off.

## Monetization

The calculator stays free with no ads. The site earns money only on job pages, and only after the day-90 gate.

| Source | When | How it pays | Constraint |
| --- | --- | --- | --- |
| Job-ad network feed (for example Talroo) | After about 5,000 monthly visitors | Per click or per application, paid by the network | Job pages only; never on the calculator |
| Featured agency listings | Phase 3 | Flat monthly fee | Must not be a fee per placed worker (employment agency license risk) |
| Training program partnerships | Phase 3 | Featured directory placement, ads on training pages, or a fixed fee per inquiry | Never per enrollment or per hire; agency-run programs need legal review first |
| Affiliate links (scrubs, shoes, CPR classes) | Optional | Small commission | FTC disclosure on every page that has them |

**Rules that protect trust**

- No ads or sponsors on the calculator, CDPAP problem pages or agency report cards.
- No home care agency advertising next to content that rates or flags agencies.
- No referral of workers to lawyers for a share of fees.

## Legal, compliance and disclaimers

No New York State or NYC law bans pay calculators. The site must still stay clear of three legal lines, all to be confirmed by a lawyer before launch. These are working notes, not legal advice.

| Area | Risk | How we stay clear |
| --- | --- | --- |
| Practicing law without a license (NY Judiciary Law) | Individualized legal advice by non-lawyers is a crime in NY; a federal court upheld this in Upsolve v. James (2025–26) | Arithmetic on published rules plus general information only. No "you should sue," no claim drafting, no one-on-one advice, including in any future AI chat |
| Employment agency license (NY General Business Law Art. 11; NYC consumer and worker protection department) | A business that helps employers find workers for a fee needs a license in NYC | Revenue from ads and flat listings only; no fee per placed worker or trainee until a lawyer confirms the rules |
| Deceptive practices (NY and NYC consumer protection) | Overstating accuracy or implying government backing | No "official" or "guaranteed" wording; independence statement on every page |
| Lawyer referral ethics (NY Rule 7.2) | Paid referral deals that tie fees to cases | No lawyer referral revenue |
| Defamation | Agency report cards | Public court records and verified reviews only, after legal review |
| Privacy | Wage data, future email list | Calculator stores nothing; email list has its own consent and privacy policy |

**Required disclaimers**

- **Calculator:** an estimate based on NY rules as of a stated date, not legal advice. May not cover every situation; union contracts (for example 1199SEIU), differentials and benefits can change what's owed. Confirm with the Department of Labor or a lawyer. Nothing entered is saved.
- **CDPAP guide:** independent and not affiliated with the NYS Department of Health, PPL or Medicaid. Information as of a stated date, with links to official sources.
- **Job listings:** provided by third parties and may be filled or expired. We don't employ anyone or endorse employers. Never pay to apply for a job.
- **Site-wide:** terms of use with a limitation of liability, a privacy policy, a note that the English version controls, and an affiliate disclosure if affiliate links are added.

**Business setup**

- [ ] Form an LLC; register the domains to the LLC.
- [ ] Get media or professional liability (E&O) insurance.
- [ ] Lawyer review: calculator rules, terms, privacy policy, disclaimers, the employment agency question and a trademark clearance for CarePayNY.

## Operating model

AI agents run the day-to-day work and the owner approves every change in a weekly 2-to-3-hour review. Agents can draft and propose, but they can never publish.

Flow: agents draft changes → review queue (pull requests) → owner's weekly review → tests pass → live. Emergencies (rate change, PPL outage, reported error, Google action, job feed down) alert the owner, who patches the same day through the same tests.

**Agent roster**

| Agent | Runs | Does | Output |
| --- | --- | --- | --- |
| Rules watcher | Daily | Checks NYS DOL and DOH wage pages and PPL notices for changes | Alert plus a draft rules update |
| Community listener | Daily | Scans public caregiver forums and Reddit for new CDPAP problems | Draft answer page or update |
| Site health | Hourly | Uptime, broken links, job feed status | Alert or auto-fix of links |
| Translator | On each approved page | Starts the machine draft in Weblate and checks glossary use | Draft marked "needs editing" for the native-speaker reviewer |
| Reporter | Weekly | Traffic, completions, subscribers, error reports | Metrics summary for the review |
| Newsletter | Weekly | Assembles alerts and what changed | Draft for approval |

**Owner's weekly review**

- [ ] Approve or reject queued changes; anything about pay or legal rules gets a line-by-line check.
- [ ] Read the metrics report against the day-90 targets.
- [ ] Clear reported errors and update the corrections log.
- [ ] Approve the newsletter.

**Emergency runbook**

| Trigger | Response time | Action |
| --- | --- | --- |
| Reported calculation error | Same day | Confirm, fix the rules file, run tests, log the correction |
| Rate change or new state notice | Within 48 hours, and before the effective date | Update the rules and explainer pages |
| PPL payroll outage | Within hours | Publish a status page with what to do |
| Google manual action | Within 1 week | Find the flagged pages, fix or remove them, request review |
| Job feed or site down | Within 1 hour | Roll back or restore |

## Technical architecture and non-functional requirements

CarePayNY runs as a static website with no database, no logins and no servers of its own. The few features that hold data are handed to outside services.

**Core stack (launch)**

| Layer | Choice | Why |
| --- | --- | --- |
| Code and content | One GitHub repository (MAM1967/carepayny) | Pages, the rules file, translations and the training list are all files; agents propose changes as pull requests |
| Site builder | Astro, static output | Markdown to fast pages, with built-in language routes (/es/, /zh/, …) |
| Translation | Weblate (self-hosted on a dedicated Mac, see `docs/weblate-mac-setup.md`), connected to the GitHub repository | Glossary, translation memory, reviewer approval; opens pull requests with approved translations (see "Translation plan") |
| Hosting and DNS | Cloudflare Pages and Cloudflare DNS | Free tier, fast on phones, deploys on every approved merge |
| Domain email | Cloudflare Email Routing | hello@carepayny.com forwards to the owner's inbox |
| Calculator | Plain JavaScript in the page | Runs on the visitor's phone; nothing is sent or stored |
| Tests | GitHub Actions running the worked examples | A failing test blocks the deploy |
| Analytics | Cloudflare Web Analytics | No cookies, no personal data, no field values |
| Uptime | A free uptime monitor | Alerts the owner when the site is down |

**Features that hold data, and where it lives**

| Feature | Phase | Data held | Where |
| --- | --- | --- | --- |
| Email alerts | 2 | Email addresses and consent | Email provider with double opt-in; text messages later, since they cost per message |
| Report an error, request a language | 1 | Message, optional email | Hosted form service or an email link to hello@ |
| Job listings | 3 | None on our side | Job-ad network's JavaScript widget, loaded in the visitor's browser, job pages only |
| School inquiry form | 3 | Name and contact, sent with consent | Hosted form service or one small Cloudflare function |
| Training directory, agency info | 2–3 | Public facts only | A data file in the repository, updated by pull request |

**How agents connect.** Agents get permission to open pull requests and nothing else. Cloudflare deploys only after the owner merges and the tests pass.

**Non-functional requirements**

- Loads in under 2 seconds on a mid-range phone over 4G.
- Meets WCAG 2.1 AA: screen reader labels, keyboard use, readable contrast.
- No third-party scripts on the calculator page (fonts are self-hosted).
- Every content and rules change is reviewable and can be rolled back in one step.
- The owner is alerted within 15 minutes of an outage.

## Roadmap and milestones

The site launches publicly at week 8 after a lawyer signs off, and makes no money before the day-90 gate passes.

| Phase | When | Scope |
| --- | --- | --- |
| 0 Foundation | Weeks 1–2 | LLC, domains, site, analytics, legal pages |
| 1 Core offer | Weeks 3–8 | Calculator, rules explainer, CDPAP guide, Spanish, about 30 pages |
| Launch gate | Week 8 | Lawyer sign-off on rules and terms; flip `LAUNCHED` in `src/data/site.js` |
| 2 Return visits | Months 3–4 | Alerts, training finder, four more languages |
| Day-90 gate | Day 90 | 5,000 visitors a month, 500 subscribers, 25% returning |
| 3 Business income | Months 5–9 | Job feed, agency listings, report cards |
| 4 Expansion | Month 9 on | Long Island, Westchester, New Jersey |

**Next 8 weeks**

- [ ] Week 1: form the LLC and move both domains to it; turn on auto-renew, registrar lock and privacy; redirect carepayny.org to carepayny.com; set up hello@carepayny.com.
- [ ] Week 1: book the lawyer review and get insurance quotes.
- [x] Week 2: set up the repository (done November 9, 2026).
- [ ] Week 2: hosting, analytics and email provider.
- [ ] Weeks 3–4: write the 20 worked examples for the lawyer.
- [ ] Weeks 3–6: write the rules explainer and CDPAP guide pages, about 30 in all.
- [ ] Week 4: set up Weblate, move all site text into language files, load the Spanish glossary, hire a Spanish reviewer.
- [ ] Weeks 5–7: Spanish translation in Weblate with native-speaker review.
- [ ] Week 7: lawyer sign-off on rules, terms, privacy policy and disclaimers.
- [ ] Week 8: public launch; start the weekly review cycle.
- [ ] Before January 1, 2027: load and test the 2027 rates.

## Risks, open questions and decisions

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Calculator gives a wrong result | Medium | High | Sourced rules file, lawyer-checked tests, error button, 48-hour fix, public corrections log |
| Google treats the site as mass-produced content | Medium | High | Few pages, each with a tool or real data; human approval on every page |
| Low return visits | Medium | High | Alerts and payday reminders; day-90 gate |
| Indeed and Google job search take the job traffic | High | Medium | Local, multilingual answer pages that national sites don't write |
| Translation error on pay rules | Medium | High | Paid native-speaker review; English controls |
| Copycat AI sites on CDPAP topics | High | Low | Accuracy, speed of updates and community presence |
| Monetization triggers a license requirement | Low | High | No per-placement fees without legal sign-off |

**Open questions for the lawyer**

- [ ] Does the $19.65 home care aide minimum apply to aides hired directly by a family?
- [ ] How does wage parity apply to overtime hours?
- [ ] Is 40 hours the right overtime threshold for live-in aides employed by agencies and PPL?
- [ ] Would flat-fee agency listings or training sponsorships require an employment agency license, and do home care placements fall under the stricter household-worker rules?

**Decisions for the owner**

- [x] Name: CarePayNY. carepayny.com and carepayny.org bought November 9, 2026.
- [ ] Day-90 targets: confirm or change the numbers in the gate.
- [ ] Order of languages after Spanish.
- [x] Weblate hosting: run it ourselves on a dedicated MacBook Pro (13-inch, 2020, Intel, macOS 26) with Docker Desktop and a Cloudflare Tunnel. Setup guide: `docs/weblate-mac-setup.md`. Revisit when macOS 26 security updates end (about 2028).
- [ ] Budget for lawyer review, insurance and translation.

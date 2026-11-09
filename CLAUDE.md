# CarePayNY — instructions for Claude and other agents

CarePayNY (carepayny.com) is a free, static website that helps New York home care workers check their pay, fix CDPAP payroll problems and find training and jobs. The full spec is `docs/PRD.md`. Read it before any non-trivial change.

## Hard rules

1. **Never push to `main`.** Work on a branch and open a pull request. The owner merges after review; Cloudflare deploys only from `main`.
2. **Pay rules live only in `src/data/rules.js`.** Every number there needs a source, an effective date and a bump to `version` and `lastReviewed`. Never hard-code a rate anywhere else.
3. **Any rules change must keep `npm test` passing and add worked examples** in `tests/calc.test.js` for the new figures. Say in the PR exactly which numbers changed and link the official source.
4. **General information only, never legal advice.** Write "this may mean you are owed more" plus who can help (Department of Labor, Legal Aid). Never "you should sue," never draft claims, never give one-on-one advice. This applies to any future chat or AI feature too.
5. **The calculator page stores and sends nothing.** No analytics on field values, no network calls, no third-party scripts, no ads, no localStorage of inputs. Fonts are self-hosted.
6. **No mass-produced pages.** Each new page must answer a real caregiver question with specific, sourced content and carry a "last checked" date. Quality over quantity; Google penalizes scaled content.
7. **Translations:** never publish machine translation directly. Agent drafts go to a native-speaker reviewer first. The English version controls.
8. **Independence:** never imply government backing or affiliation with NYS DOH, DOL, PPL or Medicaid. No "official" or "guaranteed" wording.
9. **Monetization limits:** no fees per placed worker, per trainee hired or per enrollment; no lawyer referral fees; no agency ads near content that rates agencies. See PRD "Monetization" and "Legal".
10. **Pre-launch:** `LAUNCHED` in `src/data/site.js` stays `false` (noindex + robots block) until the owner confirms lawyer sign-off.

## Layout

| Path | What it is |
| --- | --- |
| `src/data/rules.js` | The versioned NY pay rules, with sources |
| `src/data/site.js` | Launch flag and contact email |
| `src/lib/calc.js` | Pure calculator logic (browser and Node) |
| `src/pages/index.astro` | The pay calculator page |
| `src/pages/about.astro` | About, method, corrections contact |
| `src/layouts/Base.astro` | Header, footer disclaimer, meta |
| `tests/calc.test.js` | Worked examples; CI runs them on every PR |
| `docs/PRD.md` | Product requirements |

## Commands

- `npm install` then `npm run dev` for a local preview.
- `npm test` runs the worked examples.
- `npm run build` produces the static site in `dist/`.

## Style for site copy

Plain English at about a 6th-grade reading level, short sentences, active voice, written for someone on a phone who may speak English as a second language. Define any legal term the first time it appears.

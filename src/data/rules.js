// New York home care pay rules used by the calculator.
//
// THIS IS THE ONLY FILE THAT SHOULD CHANGE WHEN RATES CHANGE.
// Each year is its own rule set. rulesFor(date) picks the one in effect on that
// date, so the calculator (which runs in the visitor's browser) switches on its own.
// Every figure carries its source. Any change here must:
//   1. update `version`, `effective` and `lastReviewed`,
//   2. keep `npm test` passing (add worked examples for the new rates),
//   3. be approved by the owner in a pull request (see CLAUDE.md).

const R2026 = {
  startsOn: "2026-01-01",
  version: "2026.3",
  effective: "January 1, 2026",
  lastReviewed: "November 14, 2026",

  regions: {
    nyc: {
      label: "New York City (5 boroughs)",
      hcaMin: 19.65,     // Home care aide minimum wage, PHL § 3614-f. Covers agency, CDPAP and direct (family) hires:
                         // PHL § 3614-c(1)(d) defines "home care aide" by the work, not the employer. It leaves out only
                         // casual-basis workers and relatives paid through a government program other than CDPAP.
      generalMin: 17.00, // General minimum wage, NYC / Long Island / Westchester (shown for casual-basis work only)
      wpBenefit: 2.54,   // Wage parity benefit portion, PHL § 3614-c (2024–2026 schedule)
      wpTotal: 22.19,    // Wage parity minimum total compensation = 19.65 + 2.54
      pplBase: 20.65     // PPL's published 2026 minimum base wage for CDPAP PAs (consumer lives in Bronx, New York, Kings, Queens or Richmond)
    },
    liw: {
      label: "Nassau, Suffolk or Westchester",
      hcaMin: 19.65,
      generalMin: 17.00,
      wpBenefit: 1.67,
      wpTotal: 21.32,
      pplBase: 20.05     // PPL 2026 CDPAP base wage, consumer lives in Nassau, Suffolk or Westchester
    },
    rest: {
      label: "Rest of New York State",
      hcaMin: 18.65,
      generalMin: 16.00,
      wpBenefit: null,   // Wage parity applies only downstate
      wpTotal: null,
      pplBase: 18.65     // PPL 2026 CDPAP base wage, consumer lives in any other county
    }
  },

  // 13-hour rule for 24-hour shifts (NYS DOL; upheld in Andryeyeva v. New York Health Care, 2019).
  liveIn: { paidHours: 13, sleepHours: 8, mealHours: 3 },

  // Overtime: FLSA 40 hours for agency / third-party employers (incl. PPL for CDPAP);
  // NY 44 hours for residential employees hired directly by a household.
  overtime: { standard: 40, residentialDirectHire: 44, multiplier: 1.5 },

  // CDPAP: PPL (the statewide fiscal intermediary) publishes its own base wage for
  // personal assistants, effective January 1, 2026. It is above the state minimum
  // downstate. The state minimum stays the legal floor; PPL's rate is what PPL says it pays.
  ppl: { effective: "January 1, 2026" },

  sources: [
    { label: "NY Public Health Law § 3614-c (definition of home care aide)", url: "https://www.nysenate.gov/legislation/laws/PBH/3614-C" },
    { label: "NY Public Health Law § 3614-f (home care aide minimum wage)", url: "https://www.nysenate.gov/legislation/laws/PBH/3614-F" },
    { label: "PPL: New York CDPAP FAQ (PA wages, effective January 1, 2026)", url: "https://pplfirst.com/new-york-cdpap-frequently-asked-questions/" },
    { label: "NYS DOL: Minimum Wage for Home Care Aides", url: "https://dol.ny.gov/minimum-wage-home-care-aides-fare-grant" },
    { label: "NYS DOL: Home Health Care Aides and Wage Parity", url: "https://dol.ny.gov/home-health-care-aides-and-wage-parity" },
    { label: "Hodgson Russ: budget wage parity schedule 2024–2026", url: "https://www.hodgsonruss.com/newsroom/publications/Final-New-York-State-Budget-Imposes-New-Requirements-for-New-York-Home-Care-Providers-and-Significant-Financial-Investments-for-the-Health-Care-Industry" },
    { label: "Ogletree: Court of Appeals upholds 13-hour rule", url: "https://ogletree.com/insights/new-yorks-highest-court-upholds-13-hour-rule-for-payment-of-live-in-home-health-aides/" }
  ]
};

// 2027: NYS raised the home care aide minimum on January 1, 2027. The general
// minimum wage did not change (an inflation "off-ramp" was met). The wage parity
// benefit portion stays at the amounts set for "all periods on or after January 1, 2024."
// PPL has not yet published 2027 CDPAP rates; its 2026 downstate rates are carried
// (they are above the new minimum). Upstate, the 2026 PPL rate ($18.65) is below the
// new $19.00 minimum, so it is dropped and the legal minimum applies.
const R2027 = {
  ...R2026,
  startsOn: "2027-01-01",
  version: "2027.2",
  effective: "January 1, 2027",
  lastReviewed: "November 14, 2026",
  regions: {
    nyc:  { ...R2026.regions.nyc,  hcaMin: 20.00, generalMin: 17.00, wpBenefit: 2.54, wpTotal: 22.54, pplBase: 20.65 },
    liw:  { ...R2026.regions.liw,  hcaMin: 20.00, generalMin: 17.00, wpBenefit: 1.67, wpTotal: 21.67, pplBase: 20.05 },
    rest: { ...R2026.regions.rest, hcaMin: 19.00, generalMin: 16.00, wpBenefit: null, wpTotal: null, pplBase: null }
  },
  ppl: { effective: "January 1, 2026", note: "PPL has not posted 2027 rates yet. These are its latest posted rates." },
  sources: [
    { label: "NYS Governor: New York State Minimum Wage for 2027", url: "https://governor.ny.gov/new-york-state-minimum-wage-2027" },
    { label: "NYS DOH: Home Care Worker Wage Parity (benefit portion for all periods on or after January 1, 2024)", url: "https://www.health.ny.gov/health_care/medicaid/redesign/mrt_61.htm" },
    ...R2026.sources
  ]
};

export const RULESETS = [R2026, R2027];
export const RULES_BY_YEAR = { 2026: R2026, 2027: R2027 };

// Local date as YYYY-MM-DD (New York users; avoids UTC rolling the date early).
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function rulesFor(date = new Date()) {
  const day = isoDay(date);
  let current = RULESETS[0];
  for (const r of RULESETS) if (r.startsOn <= day) current = r;
  return current;
}

// The rule set in effect today (build time for static text, visit time in the browser).
export const RULES = rulesFor();

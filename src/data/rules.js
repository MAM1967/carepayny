// New York home care pay rules used by the calculator.
//
// THIS IS THE ONLY FILE THAT SHOULD CHANGE WHEN RATES CHANGE.
// Every figure carries its source. Any change here must:
//   1. update `version`, `effective` and `lastReviewed`,
//   2. keep `npm test` passing (add worked examples for the new rates),
//   3. be approved by the owner in a pull request (see CLAUDE.md).

export const RULES = {
  version: "2026.2",
  effective: "January 1, 2026",
  lastReviewed: "November 11, 2026",

  regions: {
    nyc: {
      label: "New York City (5 boroughs)",
      hcaMin: 19.65,     // Home care aide minimum wage, PHL § 3614-f
      generalMin: 17.00, // General minimum wage, NYC / Long Island / Westchester
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
    { label: "PPL: New York CDPAP FAQ (PA wages, effective January 1, 2026)", url: "https://pplfirst.com/new-york-cdpap-frequently-asked-questions/" },
    { label: "NYS DOL: Minimum Wage for Home Care Aides", url: "https://dol.ny.gov/minimum-wage-home-care-aides-fare-grant" },
    { label: "NYS DOL: Home Health Care Aides and Wage Parity", url: "https://dol.ny.gov/home-health-care-aides-and-wage-parity" },
    { label: "Hodgson Russ: budget wage parity schedule 2024–2026", url: "https://www.hodgsonruss.com/newsroom/publications/Final-New-York-State-Budget-Imposes-New-Requirements-for-New-York-Home-Care-Providers-and-Significant-Financial-Investments-for-the-Health-Care-Industry" },
    { label: "Ogletree: Court of Appeals upholds 13-hour rule", url: "https://ogletree.com/insights/new-yorks-highest-court-upholds-13-hour-rule-for-payment-of-live-in-home-health-aides/" }
  ]
};

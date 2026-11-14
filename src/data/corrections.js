// Public corrections log, shown at /corrections/. Newest first.
// Add an entry for every confirmed error fixed after launch (November 13, 2026):
// what was wrong, what it says now, and the source. Dates in the form "November 14, 2026".
export const CORRECTIONS = [
  {
    date: "November 14, 2026",
    page: "Pay calculator",
    href: "/",
    was: "For workers hired directly by a family, the calculator used the general minimum wage ($17.00 an hour downstate, $16.00 in the rest of the state in 2026).",
    now: "The calculator now uses the home care aide minimum for these workers ($19.65 downstate and $18.65 in the rest of the state in 2026). New York law defines \"home care aide\" by the work, not by who the employer is. The general minimum applies only to work done on a casual basis.",
    source: { label: "NY Public Health Law § 3614-c", url: "https://www.nysenate.gov/legislation/laws/PBH/3614-C" }
  }
];

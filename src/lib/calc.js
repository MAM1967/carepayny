// Pure pay-check logic. No DOM, no network, no storage.
// Each flag has a `code` and `params` so the page can show it in any language
// (src/i18n/ui/<lang>.json, keys "flag.<code>"); `text` is the English version.
// Runs in the browser (bundled by Astro) and in Node (tests).
import { RULES } from "../data/rules.js";

const r2 = (n) => Math.round(n * 100) / 100;
const money = (n) => "$" + n.toFixed(2);

/**
 * @param {object} i
 * @param {"nyc"|"liw"|"rest"} i.region
 * @param {"agency"|"cdpap"|"private"} i.employer
 * @param {"yes"|"no"|"unsure"} [i.medicaid]  only used for agency work
 * @param {number} i.rate                     hourly cash rate
 * @param {number} [i.regularHours]           hours outside 24-hour shifts
 * @param {number} [i.shifts24]
 * @param {number} [i.sleepMissed]            24h shifts without 8h sleep (5 uninterrupted)
 * @param {number} [i.mealsMissed]            24h shifts without 3h meal breaks
 * @param {boolean} [i.livesIn]               lives in the client's home
 * @param {number|null} [i.stubGross]         gross pay on the stub for the same week
 */
export function computeWeek(i, R = RULES) {
  const reg = R.regions[i.region];
  if (!reg) throw new Error(`Unknown region: ${i.region}`);
  const flags = [];
  const employer = i.employer;
  const medicaid = employer === "cdpap" ? "yes" : employer === "private" ? "no" : (i.medicaid || "unsure");

  // 1. Which minimum applies
  // The home care aide minimum covers every employer type, including families who
  // hire directly (PHL § 3614-c(1)(d) defines the job by the work). isHCA marks
  // agency and CDPAP work, which wage parity can also cover.
  const isHCA = employer === "agency" || employer === "cdpap";
  const minRate = reg.hcaMin;
  if (employer === "private") {
    flags.push({ level: "info", code: "privateFloor", params: { general: money(reg.generalMin), hca: money(reg.hcaMin) }, text: `If a family hires you directly, we use the home care aide minimum (${money(reg.hcaMin)}). New York's law sets this minimum for any worker whose main job is helping a person at home with daily activities, such as bathing, dressing or eating. It doesn't cover someone who works only now and then ("on a casual basis"). For that kind of work, the general minimum wage (${money(reg.generalMin)}) applies.` });
  }

  // 2. Hours that must be paid
  const shifts = Math.max(0, Math.floor(i.shifts24 || 0));
  const sleepMissed = Math.min(shifts, Math.max(0, Math.floor(i.sleepMissed || 0)));
  const mealsMissed = Math.min(shifts, Math.max(0, Math.floor(i.mealsMissed || 0)));
  const liveInHours = shifts * R.liveIn.paidHours + sleepMissed * R.liveIn.sleepHours + mealsMissed * R.liveIn.mealHours;
  const regularHours = Math.max(0, i.regularHours || 0);
  const totalHours = regularHours + liveInHours;

  if (shifts > 0) {
    const missed = sleepMissed || mealsMissed;
    flags.push({
      level: missed ? "warn" : "info",
      code: missed ? "shiftsMissed" : "shiftsOk",
      params: missed ? { count: Math.max(sleepMissed, mealsMissed), hours: liveInHours } : {},
      text: missed
        ? `On ${Math.max(sleepMissed, mealsMissed)} of your 24-hour shifts you didn't get the required breaks, so you must be paid for more than 13 hours on those shifts (up to all 24). We counted ${liveInHours} paid hours for your 24-hour shifts.`
        : `24-hour shifts can be paid as 13 hours only if you actually got 8 hours for sleep (5 of them uninterrupted) and 3 hours of meal breaks. If you were woken up or worked through meals, change the answers above.`
    });
  }

  // 3. Overtime
  const threshold = (employer === "private" && i.livesIn) ? R.overtime.residentialDirectHire : R.overtime.standard;
  const otHours = Math.max(0, totalHours - threshold);
  const straightHours = totalHours - otHours;

  // 4. Rate check
  const rate = Math.max(0, i.rate || 0);
  const rateShort = r2(Math.max(0, minRate - rate));
  if (rateShort > 0) {
    flags.push({ level: "bad", code: "rateShort", params: { rate: money(rate), min: money(minRate), short: money(rateShort) }, text: `Your hourly rate (${money(rate)}) is below the minimum of ${money(minRate)} that applies to you by ${money(rateShort)} an hour.` });
  }
  // CDPAP: PPL publishes its own base wage, which is above the state minimum downstate.
  const pplRate = employer === "cdpap" && reg.pplBase != null && reg.pplBase >= minRate ? reg.pplBase : null;
  const pplShort = pplRate != null ? r2(Math.max(0, pplRate - Math.max(rate, minRate))) : 0;
  if (pplShort > 0) {
    flags.push({ level: "warn", code: "pplShort", params: { ppl: money(pplRate), region: i.region, date: R.ppl.effective, short: money(pplShort) }, text: `PPL says its base pay for CDPAP is ${money(pplRate)} an hour when the person you care for lives in ${reg.label} (since ${R.ppl.effective}). The rate you entered is ${money(pplShort)} less than that.` });
  }
  const payRate = Math.max(rate, minRate, pplRate ?? 0);
  const expectedGross = r2(straightHours * payRate + otHours * payRate * R.overtime.multiplier);
  const legalFloorGross = r2(straightHours * minRate + otHours * minRate * R.overtime.multiplier);

  // 5. Wage parity (Medicaid work downstate)
  let wp = null;
  if (reg.wpTotal && isHCA && medicaid !== "no") {
    const gapPerHour = r2(Math.max(0, reg.wpTotal - payRate));
    wp = {
      applies: medicaid === "yes" ? "yes" : "maybe",
      total: reg.wpTotal,
      benefit: reg.wpBenefit,
      gapPerHour,
      gapWeek: r2(gapPerHour * totalHours),
      coveredInCash: gapPerHour === 0
    };
  }

  // 6. Pay stub comparison
  let stub = null;
  if (i.stubGross != null && i.stubGross !== "" && !Number.isNaN(Number(i.stubGross))) {
    const entered = Number(i.stubGross);
    const diff = r2(expectedGross - entered);
    stub = { entered, diff };
    if (diff > 1) flags.push({ level: "bad", code: "stubShort", params: { entered: money(entered), diff: money(diff) }, text: `Your pay stub shows ${money(entered)}, about ${money(diff)} less than we'd expect for these hours.` });
  }

  // 7. Overall status
  let status = "ok";
  if (flags.some((f) => f.level === "bad")) status = "bad";
  else if (flags.some((f) => f.level === "warn") || (wp && !wp.coveredInCash)) status = "check";

  return {
    minRate, pplRate, pplShort, isHCA, medicaid, regularHours, liveInHours, totalHours, threshold, otHours, straightHours,
    payRate, expectedGross, legalFloorGross, rateShort, wp, stub, flags, status, region: i.region, regionLabel: reg.label
  };
}

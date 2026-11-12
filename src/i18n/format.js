// Tiny message formatter: replaces {name} with values. No plurals by design;
// write messages so they don't need them (docs/translation/prompts.md).
export function fmt(message, vars = {}) {
  if (message == null) return message;
  return message.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
export function makeT(dict, fallback = {}) {
  return (key, vars) => {
    const msg = dict[key] ?? fallback[key];
    if (msg == null) throw new Error(`Missing UI string: ${key}`);
    return fmt(msg, vars);
  };
}
// "January 1, 2026" (English, as written in rules.js) -> localized long date.
const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
export function localDate(englishDate, intlLocale) {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(String(englishDate).trim());
  if (!m) return englishDate;
  const d = new Date(Date.UTC(+m[3], MONTHS.indexOf(m[1].toLowerCase()), +m[2], 12));
  return new Intl.DateTimeFormat(intlLocale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(d);
}

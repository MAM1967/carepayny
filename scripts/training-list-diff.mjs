// Compare two versions of src/data/training-programs.js and print a Markdown summary
// for the pull request. Also exits 2 if the new list fails the safety check.
// Usage: node scripts/training-list-diff.mjs <old.mjs> <new.mjs>
import { pathToFileURL } from "node:url";

const [oldPath, newPath] = process.argv.slice(2);
const load = async (p) => (await import(pathToFileURL(p).href)).default;
const A = await load(oldPath);
const B = await load(newPath);

const byId = (d) => new Map(d.programs.map((p) => [p.id, p]));
const a = byId(A), b = byId(B);
const label = (p) => `${p.name} (${p.address}, ${p.city}, ${p.county} County)`;
const kinds = (p) => [p.hha && `HHA: ${p.hhaLangs.join(", ")}`, p.pca && `PCA: ${p.pcaLangs.join(", ")}`, p.hybrid.length && `part online: ${p.hybrid.join(", ")}`].filter(Boolean).join("; ");

const added = [...b.values()].filter((p) => !a.has(p.id));
const removed = [...a.values()].filter((p) => !b.has(p.id));
const changed = [...b.values()].filter((p) => a.has(p.id)).flatMap((p) => {
  const o = a.get(p.id);
  const notes = [];
  if (kinds(o) !== kinds(p)) notes.push(`training/languages: ${kinds(o)} → ${kinds(p)}`);
  for (const f of ["name", "address", "city", "zip", "phone", "county"]) if (o[f] !== p[f]) notes.push(`${f}: ${o[f]} → ${p[f]}`);
  return notes.length ? [{ p, notes }] : [];
});

// Safety check: a broken or partial DOH file should never reach the site.
const change = Math.abs(B.programs.length - A.programs.length) / A.programs.length;
const problems = [];
if (B.rowsInSource < 1000) problems.push(`Only ${B.rowsInSource} rows in the DOH file (expected 1,000 or more).`);
if (change > 0.15) problems.push(`Listings changed by ${(change * 100).toFixed(1)}% (${A.programs.length} → ${B.programs.length}); the limit is 15%.`);

const list = (items, fmt) => (items.length ? items.map((x) => `- ${fmt(x)}`).join("\n") : "- None");
console.log(`## DOH training program list: ${A.reportDate} → ${B.reportDate}

| | Before | After |
| --- | --- | --- |
| DOH report date | ${A.reportDate} | ${B.reportDate} |
| DOH rows | ${A.rowsInSource} | ${B.rowsInSource} |
| Listings on the site | ${A.programs.length} | ${B.programs.length} |

### Added (${added.length})
${list(added, (p) => `${label(p)}: ${kinds(p)}`)}

### Removed (${removed.length})
${list(removed, label)}

### Changed (${changed.length})
${list(changed, ({ p, notes }) => `${label(p)}: ${notes.join("; ")}`)}
${problems.length ? `\n### Safety check failed\n${problems.map((x) => `- ${x}`).join("\n")}\n` : ""}`);

if (problems.length) process.exit(2);

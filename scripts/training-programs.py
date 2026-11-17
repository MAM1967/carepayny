#!/usr/bin/env python3
"""Build src/data/training-programs.js from the NYS DOH list of approved
PCA and HHA training programs (training_program_list.pdf).

Usage:
  pip install pdfplumber
  curl -L -o /tmp/list.pdf https://healthweb-back.health.ny.gov/facilities/home_care/docs/training_program_list.pdf
  python3 scripts/training-programs.py /tmp/list.pdf

The DOH file has one row per program, per language, per address. We merge rows
that share an agency and a street address into one listing. Nothing is added
that is not in the DOH file, except the ids and the region names.
Listing order is neutral: by county, then by name (A to Z). Never by payment.
"""
import json, re, sys
from datetime import date
from pathlib import Path

import pdfplumber

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "training-programs.js"
SOURCE_URL = "https://www.health.ny.gov/facilities/home_care/docs/training_program_list.pdf"

# County -> region: Empire State Development's 10 economic development regions.
REGIONS = {
    "New York City": ["Bronx", "Kings", "New York", "Queens", "Richmond"],
    "Long Island": ["Nassau", "Suffolk"],
    "Mid-Hudson": ["Dutchess", "Orange", "Putnam", "Rockland", "Sullivan", "Ulster", "Westchester"],
    "Capital Region": ["Albany", "Columbia", "Greene", "Rensselaer", "Saratoga", "Schenectady", "Warren", "Washington"],
    "Central New York": ["Cayuga", "Cortland", "Madison", "Onondaga", "Oswego"],
    "Finger Lakes": ["Genesee", "Livingston", "Monroe", "Ontario", "Orleans", "Seneca", "Wayne", "Wyoming", "Yates"],
    "Mohawk Valley": ["Fulton", "Herkimer", "Montgomery", "Oneida", "Otsego", "Schoharie"],
    "North Country": ["Clinton", "Essex", "Franklin", "Hamilton", "Jefferson", "Lewis", "Saint Lawrence"],
    "Southern Tier": ["Broome", "Chemung", "Chenango", "Delaware", "Schuyler", "Steuben", "Tioga", "Tompkins"],
    "Western New York": ["Allegany", "Cattaraugus", "Chautauqua", "Erie", "Niagara"],
}
REGION_OF = {c: r for r, cs in REGIONS.items() for c in cs}
# County -> area shown on the site. NYC counties use borough names.
BOROUGH = {"Bronx": "Bronx", "Kings": "Brooklyn", "New York": "Manhattan", "Queens": "Queens", "Richmond": "Staten Island"}
LANGS = {"English": "en", "Spanish; Castilian": "es", "Chinese": "zh", "Russian": "ru", "Korean": "ko"}
SMALL = {"of", "and", "the", "at", "for", "&"}
# Spelling mistakes and cut-off city names in the DOH file, fixed for display. Addresses and names are not changed.
CITY_FIX = {
    "Hopewell Junctio": "Hopewell Junction", "Long Island C": "Long Island City", "Lic": "Long Island City",
    "Rockville Cen": "Rockville Centre", "West Hempstea": "West Hempstead", "Elmhurst N": "Elmhurst",
    "Kingston NY": "Kingston", "Smithtown NY": "Smithtown", "Hornel": "Hornell", "Poughkeepie": "Poughkeepsie",
    "Poughkeepskie": "Poughkeepsie", "White Plais": "White Plains", "Syrcuse": "Syracuse", "Cheektowga": "Cheektowaga",
    "Plattsburg": "Plattsburgh", "Mt Vernon": "Mount Vernon", "Mt. Vernon": "Mount Vernon", "Mt. Kisco": "Mount Kisco",
    "Mt.kisco": "Mount Kisco", "Wappinger Falls": "Wappingers Falls", "Bayshore": "Bay Shore",
    "Johnson CIty": "Johnson City", "queens": "Queens",
}
KEEP_UPPER = {"LLC", "INC", "PC", "NY", "NYC", "LHCSA", "CHHA", "HHA", "PCA", "II", "III", "VNS", "CDPAP", "USA", "LTD", "CORP", "ACD", "JASA", "FEGS", "VNSNY", "HCS", "RN", "NE", "NW", "SE", "SW"}


def tidy(s):
    return re.sub(r"\s+", " ", (s or "").replace("\n", " ")).strip()


def title_case(s):
    """Fix ALL-CAPS text only. Mixed-case text is kept as DOH wrote it."""
    if not s or s != s.upper():
        return s
    words = []
    for i, w in enumerate(s.split(" ")):
        core = re.sub(r"[^A-Z0-9]", "", w)
        if core in KEEP_UPPER or re.fullmatch(r"\d+[A-Z]?", core or "x"):
            words.append(w if core not in {"INC", "CORP", "LTD"} else w.capitalize())
        elif i > 0 and w.lower() in SMALL:
            words.append(w.lower())
        else:
            words.append("-".join(p[:1] + p[1:].lower() for p in w.split("-")))
    out = " ".join(words)
    return re.sub(r"\b(\d+)(St|Nd|Rd|Th)\b", lambda m: m.group(1) + m.group(2).lower(), out)


def best(variants):
    """Prefer the version DOH wrote in mixed case; else fix the caps."""
    mixed = [v for v in variants if v != v.upper()]
    return mixed[0] if mixed else title_case(variants[0])


def norm_name(s):
    s = re.sub(r"[^a-z0-9 ]", " ", s.lower())
    s = re.sub(r"\b(inc|llc|ltd|corp|corporation|co|the|pc)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def street_key(addr):
    a = addr.lower()
    num = re.match(r"\s*([\d-]+)", a)
    words = re.findall(r"[a-z]+", a)
    first = next((w for w in words if w not in {"east", "west", "north", "south", "e", "w", "n", "s"}), "")
    return f"{num.group(1) if num else ''}-{first[:5]}"


def most_common(values):
    """Most frequent value; ties go to the one DOH lists first. Deterministic, so ids stay stable."""
    return max(dict.fromkeys(values), key=values.count)


def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")


def main(pdf_path):
    rows, report_date = [], None
    with pdfplumber.open(pdf_path) as pdf:
        head = pdf.pages[0].extract_text() or ""
        m = re.search(r"(\d{2})/(\d{2})/(\d{4})", head)
        if m:
            report_date = date(int(m.group(3)), int(m.group(1)), int(m.group(2))).isoformat()
        for page in pdf.pages:
            for table in page.extract_tables():
                for r in table:
                    r = [tidy(c) for c in r]
                    if len(r) != 8 or r[0].startswith("Name of Training"):
                        continue
                    # pdfplumber sometimes cuts a long city name into the zip cell ("Wappingers Fall" + "s 12590").
                    m = re.fullmatch(r"(\D+?)\s*(\d{5})", r[3])
                    if m:
                        r[2], r[3] = r[2] + m.group(1).strip(), m.group(2)
                    rows.append(r)
    if not rows or not report_date:
        sys.exit("No rows or no report date found: the PDF layout may have changed.")

    groups = {}
    for name, addr, city, zipc, phone, county, cert, lang in rows:
        key = (norm_name(name), street_key(addr), CITY_FIX.get(title_case(city), title_case(city)).lower())
        g = groups.setdefault(key, {"names": [], "addrs": [], "cities": [], "zips": [], "phones": [], "county": county, "types": set(), "langs": {"HHA": set(), "PCA": set()}})
        g["names"].append(name); g["addrs"].append(addr); g["cities"].append(city)
        g["zips"].append(zipc); g["phones"].append(phone)
        hybrid = cert.upper().startswith("HYBRID")
        kind = cert.upper().replace("HYBRID", "").strip()
        if kind not in {"HHA", "PCA"}:
            sys.exit(f"Unknown program type: {cert!r}")
        g["types"].add(f"{kind}-hybrid" if hybrid else kind)
        if lang not in LANGS:
            sys.exit(f"Unknown language: {lang!r}")
        g["langs"][kind].add(LANGS[lang])

    # Keep each program's id from the last run, so click counts stay with the same place
    # month to month. A place is "the same" if its name, street, city and zip match.
    def same_place(name, address, city, zipc):
        return (norm_name(name), street_key(address), city.lower(), zipc)
    old_exact, old_ids, old_loose = {}, {}, {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text().split("export default ", 1)[1].rstrip().rstrip(";"))
            old_exact = {(p["name"], p["address"], p["city"], p["zip"]): p["id"] for p in old["programs"]}
            old_ids = {same_place(p["name"], p["address"], p["city"], p["zip"]): p["id"] for p in old["programs"]}
            # Fallback without the zip (DOH sometimes lists one place under two zips).
            loose = {}
            for p in old["programs"]:
                loose.setdefault(same_place(p["name"], p["address"], p["city"], "")[:3], []).append(p["id"])
            old_loose = {k: v[0] for k, v in loose.items() if len(v) == 1}
        except (IndexError, ValueError, KeyError):
            print("Could not read the old data file; making new ids.")
    used = set()
    programs, seen = [], {}
    for g in groups.values():
        name = best(g["names"])
        county = g["county"]
        zipc = most_common(g["zips"])
        city = CITY_FIX.get(best(g["cities"]), best(g["cities"]))
        address = best(g["addrs"])
        key = same_place(name, address, city, zipc)
        # Exact match first, then looser ones. An id already taken this run is never reused.
        pid = next((c for c in (old_exact.get((name, address, city, zipc)), old_ids.get(key), old_loose.get(key[:3])) if c and c not in used), None)
        if not pid:
            base = slug(f"{name}-{zipc}")[:60].strip("-")
            pid, n = base, 1
            while pid in used or pid in old_ids.values():
                n += 1
                pid = f"{base[:57]}-{n}"
        used.add(pid)
        types = g["types"]
        programs.append({
            "id": pid,
            "name": name,
            "address": address,
            "city": city,
            "zip": zipc,
            "phone": most_common(g["phones"]),
            "county": county,
            "area": BOROUGH.get(county, county),
            "region": REGION_OF.get(county) or sys.exit(f"County not in any region: {county!r}"),
            "hha": "HHA" in types or "HHA-hybrid" in types,
            "pca": "PCA" in types or "PCA-hybrid" in types,
            "hybrid": [t.split("-")[0] for t in sorted(types) if t.endswith("-hybrid")],
            # Languages per training type: a place may teach PCA in Chinese but HHA only in English.
            "hhaLangs": [l for l in LANGS.values() if l in g["langs"]["HHA"]],
            "pcaLangs": [l for l in LANGS.values() if l in g["langs"]["PCA"]],
            "url": None  # The DOH list has no websites. Add one only after checking it.
        })

    programs.sort(key=lambda p: (p["county"], p["name"].lower(), p["address"]))
    today = date.today()
    data = {
        # The day the list was last rebuilt from DOH's file (shown on the page as "Last checked").
        "lastChecked": f"{today:%B} {today.day}, {today.year}",
        "source": SOURCE_URL,
        "regions": list(REGIONS),
        "reportDate": report_date,
        "rowsInSource": len(rows),
        "programs": programs
    }
    header = ("// GENERATED by scripts/training-programs.py from the NYS DOH list of approved\n"
              "// PCA and HHA training programs. Do not edit by hand: rerun the script.\n")
    OUT.write_text(header + "export default " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    print(f"{len(rows)} DOH rows -> {len(programs)} listings, report date {report_date}. Wrote {OUT}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "training_program_list.pdf")

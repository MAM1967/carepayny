#!/usr/bin/env python3
"""Decide whether a downloaded DOH training program list is ready to use.

Owner's rule (November 16, 2026): DOH updates its list about once a month
(NY Public Health Law §3613(4): "at least monthly"; lists are dated on the first
business day of the month). We take a new list only after at least 3 New York
business days have passed since its report date, so we don't pick up a list
during DOH maintenance or a half-finished update.

Usage:
  python3 scripts/doh-list-check.py /tmp/list.pdf [--today YYYY-MM-DD]
  python3 scripts/doh-list-check.py --self-test

Prints one line and, in GitHub Actions, writes to $GITHUB_OUTPUT:
  status=new|same|wait|older   report_date=YYYY-MM-DD   eligible=YYYY-MM-DD
Exit code 0 in every one of those cases; 1 if the PDF can't be read.
"""
import json, os, re, sys
from datetime import date, timedelta
from pathlib import Path

WAIT_BUSINESS_DAYS = 3
DATA = Path(__file__).resolve().parent.parent / "src" / "data" / "training-programs.js"


def nth_weekday(year, month, weekday, n):
    """n-th weekday (Mon=0) of a month; n=-1 for the last one."""
    if n > 0:
        d = date(year, month, 1)
        d += timedelta(days=(weekday - d.weekday()) % 7)
        return d + timedelta(weeks=n - 1)
    d = date(year, month + 1, 1) - timedelta(days=1) if month < 12 else date(year, 12, 31)
    return d - timedelta(days=(d.weekday() - weekday) % 7)


def observed(d):
    """A holiday on Saturday is observed Friday; on Sunday, Monday."""
    return d - timedelta(days=1) if d.weekday() == 5 else d + timedelta(days=1) if d.weekday() == 6 else d


def ny_holidays(year):
    """New York State holidays (Public Officers Law §24 and General Construction Law §24)."""
    fixed = [date(year, 1, 1), date(year, 2, 12), date(year, 6, 19), date(year, 7, 4),
             date(year, 11, 11), date(year, 12, 25)]
    nov_first_monday = nth_weekday(year, 11, 0, 1)
    moving = [
        nth_weekday(year, 1, 0, 3),    # Martin Luther King Jr. Day
        nth_weekday(year, 2, 0, 3),    # Washington's Birthday
        nth_weekday(year, 5, 0, -1),   # Memorial Day
        nth_weekday(year, 9, 0, 1),    # Labor Day
        nth_weekday(year, 10, 0, 2),   # Columbus Day
        nov_first_monday + timedelta(days=1),  # Election Day (Tuesday after the first Monday)
        nth_weekday(year, 11, 3, 4),   # Thanksgiving
    ]
    return {observed(d) for d in fixed} | set(moving)


def is_business_day(d):
    return d.weekday() < 5 and d not in ny_holidays(d.year)


def add_business_days(start, n):
    d = start
    while n > 0:
        d += timedelta(days=1)
        if is_business_day(d):
            n -= 1
    return d


def report_date_of(pdf_path):
    import pdfplumber
    with pdfplumber.open(pdf_path) as pdf:
        m = re.search(r"(\d{2})/(\d{2})/(\d{4})", pdf.pages[0].extract_text() or "")
    if not m:
        return None
    return date(int(m.group(3)), int(m.group(1)), int(m.group(2)))


def current_report_date():
    m = re.search(r'"reportDate":\s*"(\d{4}-\d{2}-\d{2})"', DATA.read_text())
    return date.fromisoformat(m.group(1)) if m else None


def decide(new, current, today):
    eligible = add_business_days(new, WAIT_BUSINESS_DAYS)
    if current and new == current:
        status = "same"
    elif current and new < current:
        status = "older"
    elif today < eligible:
        status = "wait"
    else:
        status = "new"
    return status, eligible


def self_test():
    assert date(2026, 11, 3) in ny_holidays(2026)           # Election Day 2026
    assert date(2026, 11, 26) in ny_holidays(2026)          # Thanksgiving 2026
    assert date(2027, 7, 5) in ny_holidays(2027)            # July 4, 2027 is a Sunday
    # List dated Mon Nov 2, 2026: Tue Nov 3 is Election Day, so 3 business days ends Fri Nov 6.
    assert add_business_days(date(2026, 11, 2), 3) == date(2026, 11, 6)
    assert decide(date(2026, 11, 2), date(2026, 10, 1), date(2026, 11, 5))[0] == "wait"
    assert decide(date(2026, 11, 2), date(2026, 10, 1), date(2026, 11, 6))[0] == "new"
    assert decide(date(2026, 11, 2), date(2026, 11, 2), date(2026, 11, 20))[0] == "same"
    # Worst case early in a month: Fri Jan 1, 2027 holiday -> list Mon Jan 4 -> ready Thu Jan 7,
    # before the workflow's run on the 8th.
    assert add_business_days(date(2027, 1, 4), 3) == date(2027, 1, 7)
    print("self-test ok")


def main():
    args = sys.argv[1:]
    if args == ["--self-test"]:
        return self_test()
    today = date.today()
    if "--today" in args:
        today = date.fromisoformat(args[args.index("--today") + 1])
    new = report_date_of(args[0])
    if not new:
        print("Could not read a report date from the PDF.")
        sys.exit(1)
    status, eligible = decide(new, current_report_date(), today)
    print(json.dumps({"status": status, "report_date": new.isoformat(), "eligible": eligible.isoformat(), "today": today.isoformat()}))
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as f:
            f.write(f"status={status}\nreport_date={new.isoformat()}\neligible={eligible.isoformat()}\n")


if __name__ == "__main__":
    main()

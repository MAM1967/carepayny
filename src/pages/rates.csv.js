import { ratesCsv } from "../lib/rates.js";

// /rates.csv: the same data as /rates/, built from src/data/rules.js at build time.
export function GET() {
  return new Response(ratesCsv(), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "inline; filename=\"carepayny-ny-home-care-pay-rates.csv\"" }
  });
}

// Outbound links for the training programs list (src/components/ProgramsPage.astro).
// Built into the page as direct links (Google Maps, or the program's website with tags), so search
// engines don't see thousands of redirecting /go/ addresses (Search Console "Page with redirect",
// Nov 2026). functions/go/[id].js uses the same functions for old /go/ links that are still shared.

// Tags added to program websites so the program can see visits from CarePayNY in its own analytics.
export const UTM = { utm_source: "carepayny", utm_medium: "referral", utm_campaign: "training-directory" };

export function mapUrl(p) {
  const q = `${p.name}, ${p.address}, ${p.city}, NY ${p.zip}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function webUrl(p) {
  if (!p.url) return null;
  try {
    const u = new URL(p.url);
    for (const [k, v] of Object.entries(UTM)) u.searchParams.set(k, v);
    return u.toString();
  } catch { return null; }
}

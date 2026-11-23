# Search stats (Google Search Console + Bing Webmaster Tools)

A small Cloudflare Worker, `carepayny-search-stats` (code in `workers/search-stats/`), reads search data for carepayny.com once a day and saves it where the weekly traffic report can read it.

- **What it saves:** for each Monday–Sunday week (New York dates): Google and Bing search impressions, clicks, average position (Google), top 10 search terms, top 10 pages (Google), pages in Bing's index and Bing crawl counts. It also checks about 25 sitemap pages a day with Google's URL Inspection tool, so every page gets checked about every 5 days, and saves how many pages are on Google.
- **Where:** Workers KV namespace `carepayny_search` (id `6bab8cdeddd84e60b920805e586f33cc`).
  - `week:YYYY-MM-DD` (the Monday): that week's totals. The last 2 weeks are pulled again every day, because Google's numbers for the last 2–3 days fill in late.
  - `google-index:YYYY-MM-DD`: pages on Google as of that day (kept about 13 months).
  - `google-inspect`: the last check result for each page.
  - `status`: time of the last run and any errors (for example, a missing key).
- **What it does not do:** it collects nothing from site visitors and adds nothing to the website. It has no public web address. It only reads Google's and Bing's reports about the site.
- **Cost:** $0. It runs once a day and makes about 40 outside requests, which fits the free Workers plan. Google's URL Inspection limit is 2,000 a day, and it uses 25.

## One-time setup (about 20 minutes)

### 1. Google: create a service account and give it Search Console access

1. Go to <https://console.cloud.google.com/> and sign in with the Google account that owns Search Console for carepayny.com.
2. At the top, create a new project. Name it `carepayny-search`.
3. In the search bar, type **Google Search Console API**, open it and click **Enable**.
4. Go to **IAM & Admin → Service Accounts → Create service account**. Name it `carepayny-search-stats`. Skip the optional role and user steps and click **Done**.
5. Open the new service account, then **Keys → Add key → Create new key → JSON**. A `.json` file downloads. Keep it private. Don't commit it or email it.
6. Copy the service account's email address. It looks like `carepayny-search-stats@carepayny-search.iam.gserviceaccount.com`.
7. In Search Console (<https://search.google.com/search-console>), open the carepayny.com property, then **Settings → Users and permissions → Add user**. Paste the email and choose **Restricted** (read-only is enough).
8. Check which kind of property you have. In the property picker:
   - "carepayny.com" with no `https://` is a **Domain** property. Keep `GSC_SITE = "sc-domain:carepayny.com"` in `workers/search-stats/wrangler.toml`.
   - "https://carepayny.com/" is a **URL-prefix** property. Change `GSC_SITE` to `"https://carepayny.com/"`.

### 2. Bing: copy the API key

1. Go to <https://www.bing.com/webmasters/> and open carepayny.com.
2. Click the gear icon (**Settings**) → **API access** → **API Key** → **Generate** (or copy the one shown).

### 3. Deploy the Worker and add the two keys

On your Mac, in the repo folder, after this pull request is merged:

```sh
git pull
cd workers/search-stats
npx wrangler login                     # once; opens the browser
npx wrangler deploy
npx wrangler secret put GSC_SERVICE_ACCOUNT_JSON < ~/Downloads/carepayny-search-xxxx.json
npx wrangler secret put BING_API_KEY   # paste the key when asked
```

Then delete the downloaded `.json` key file from Downloads (Cloudflare keeps the only copy it needs).

### 4. Check it

- In the Cloudflare dashboard: **Workers & Pages → carepayny-search-stats → Settings → Trigger Events**. You can wait for the daily run at 4:17 AM New York time, or run it now from the cron trigger's menu.
- Then **Storage & Databases → KV → carepayny_search** should show `status`, `week:…` and `google-index:…` keys. If `status` lists errors, they say which key or permission is missing.

## Notes

- Google's numbers use Pacific time days, and the last 2–3 days are usually incomplete. Monday's report says so.
- Bing groups its search-term numbers by week on its own schedule, so a week's Bing search terms can be empty even when Bing shows impressions.
- If the free plan's limit is ever a problem (for example, the sitemap grows a lot), lower `INSPECT_PER_RUN`.
- To stop it: delete the Worker in the Cloudflare dashboard, or remove the user from Search Console and delete the Bing API key.

# Google Maps lookup - setup (free tier only)

The "From Google Maps" section is OFF unless `GOOGLE_PLACES_API_KEY` is set on the server. With no key the site is OpenStreetMap / open data only. Google results are shown live with attribution and a link to Google Maps; nothing from Google is stored or listed, and nothing goes in the sitemap.

## 1. Cloud project
1. Open https://console.cloud.google.com and create a project, for example `wheretopray-places`.
2. Attach a billing account (Google requires one even for free usage).

## 2. Enable Places API (New)
APIs and Services - Library - search "Places API (New)" - Enable. Do not enable the legacy Places API or the Maps JavaScript API.

## 3. Create a restricted key
APIs and Services - Credentials - Create credentials - API key, then Edit:
- API restrictions: Restrict key - only "Places API (New)".
- Application restrictions: None (calls come from Netlify servers with changing IPs). The key is server-only and never sent to browsers.

## 4. Quotas below the free limit (hard stop at Google)
APIs and Services - Places API (New) - Quotas. Set "Text Search Pro requests per day" to about 900 (about 28,000 a month) and per-minute to 30. Google stops calls past this, independent of our app.

## 5. Billing alerts
Billing - Budgets and alerts - Create budget: amount 1 (your currency), alerts at 50, 90 and 100 percent, email to the owner.

## 6. Set the key on Netlify (never commit it)
```
netlify env:set GOOGLE_PLACES_API_KEY <key> --secret --context production deploy-preview branch-deploy
netlify env:set GOOGLE_MONTHLY_CAP 28000      # optional, default 28000 (80 percent of 35k free Text Search Pro)
netlify env:set GOOGLE_IP_HOURLY 20           # optional, per-visitor hourly limit
```
Redeploy. `ADMIN_TOKEN` must also be set, the counter RPCs use it.

## How the app keeps it free
- Field mask: `places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType` (Text Search Pro SKU, the cheapest that returns a location).
- Before every call the server reserves a slot in a DB monthly counter (`server_google_take`). At the cap it shows "Google results paused this month" and makes no call.
- Per-visitor limits: 6 a minute in memory, `GOOGLE_IP_HOURLY` an hour in the DB.
- Calls only on a button press or a "near me" query, limited to a small map area.
- Admin page shows "Google Maps usage" for the current month.

To turn it off immediately: `netlify env:unset GOOGLE_PLACES_API_KEY` and redeploy, or set `GOOGLE_MONTHLY_CAP 0`.

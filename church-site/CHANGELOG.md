# Changelog — church-site

The current version and date are also stamped at the top of every built page in
`dist/` and at the top of `styles.css`.

## v1.3 — 2026-11-10
- Home page: updated the weekly message video.

## v1.2 — 2026-11-06
- Fix: the loader now injects the stylesheet **inside the page body** instead of `<head>`. GoHighLevel rewrites `<head>` and was dropping the injected stylesheet link, so pages loaded their content but unstyled. CSS now persists.

## v1.1 — 2026-11-03
- Step 2 live-update pipeline: build now emits `hosted/` (shared CSS + one JS loader per page) and `loaders/` (the one-time GoHighLevel snippet).
- Added `.github/workflows/church-publish.yml` — publishes `hosted/` to `church/` on the `site-assets` branch (Cloudflare → assets.rockstarinfo.com/church/) on every change to `main`.
- After the one-time loader paste per page, all future content/CSS/schema/SEO changes go live with no re-paste.

## v1.0 — 2026-11-03
- Added `Event` schema to the Meal page (free monthly community meal) and `Person` schema (Pastor Mat) to the booking page.
- Every built page and the stylesheet now carry a version + "updated" date stamp at the top (driven by `version`/`updated` in `site.config.json`).
- Resources page: added a note by the books directing people to the Contact page for info on getting a copy.

## v0.5 — 2026-11-03
- Added Schema.org JSON-LD to every page (Church, WebSite, WebPage, BreadcrumbList; Resources adds a Book ItemList), generated from config.
- Church schema uses the real postal address + geo for maps accuracy, with areaServed = Smithville, TN for marketing.
- `pages.json` now also holds each page's SEO title/description/path (single source for SEO + schema).

## v0.4 — 2026-11-03
- Added per-page social sharing (OG) images for all 11 pages in `og/` (1200x630).
- Added `SEO.md`: SEO title + meta description + share image for every page, with location messaging focused on Smithville, TN.

## v0.3 — 2026-11-02
- Migrated the remaining pages: resources, generosity, meal, privacy-policy, terms-of-service. All eleven pages build from the shared config.
- Folded each page's own CSS into the shared `styles.css` (page-specific layout only; shared chrome reused).
- Meal page cleaned for the location move ("Right after the 10 AM gathering"); "Plan Your Visit" → "Get Connected".
- Added `serviceTimeOnly` ("10 AM") for inline time phrasing.

## v0.2 — 2026-11-02
- Migrated home, contact-us, social, past-sermons, and the Pastor Mat booking page.
- Location move to 273 Dry Creek Rd: removed park / cookout / summertime references; the gathering is indoors.
- Home "What to Expect": removed the splash-pad and Greenbrook parking cards; rewrote "Come as you are". All service times 10 AM.
- Added a seasonal home banner, kept commented/hidden by default.

## v0.1 — 2026-11-02
- Initial version-controlled setup for the localchurchgathering.com site.
- Config-driven build (`site.config.json` + `build.py`): shared header, footer, menu, address, and service time in one place, assembled into full pages in `dist/`.
- Shared `styles.css` covering all page layouts.
- Standardized top menu; Family Meal kept as a seasonal page (out of menu/footer).
- Footer includes Privacy Policy and Terms of Service links.
- Church address: 273 Dry Creek Rd, Dowelltown, TN 37059 with Google Maps link.

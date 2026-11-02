# Changelog — church-site

## v0.3 — 2026-11-02
- Migrated the remaining pages: resources, generosity, meal, privacy-policy, terms-of-service. All eleven pages are now version-controlled and build from the shared config.
- Folded each page's own CSS into the shared styles.css (resources, generosity, meal, privacy, terms, plus the shared scripture card). Shared chrome is reused; only page-specific layout was added.
- Meal page cleaned for the location move (address/map tokens, "Right after the 10 AM gathering"); "Plan Your Visit" → "Get Connected".
- Added `serviceTimeOnly` ("10 AM") for inline time phrasing.
- Verified rendered layout for the complex pages (generosity, privacy, meal, resources).

## v0.2 — 2026-11-02
- Migrated pages: home, contact-us, social, past-sermons, and the Pastor Mat booking page (Beliefs already in v0.1).
- Location move to 273 Dry Creek Rd reflected in copy: removed "in the park", "family cookout", and "summertime" references; the gathering is indoors.
- Home "What to Expect": removed the splash-pad ("Stay & play") card and the Greenbrook-specific "Easy parking" card; rewrote "Come as you are" (come however you're dressed, everyone welcome). Four cards remain.
- All service times are 10 AM (fixed the Pastor Mat page's leftover 11 AM).
- Added a seasonal banner block to the home page, kept commented/hidden by default.

## v0.1 — 2026-11-02
- Initial version-controlled setup for the localchurchgathering.com site.
- Config-driven build (`site.config.json` + `build.py`): shared header, footer, menu, address, and service time live in one place and assemble into full pages in `dist/`.
- Shared `styles.css` covering all page layouts (home, inner pages, contact/booking, social, resources, meal, generosity, footer, sticky CTA, alert banners).
- Standardized top menu: Home, Messages, Beliefs, Social Media, Contact, Generosity, Blog, Church Merch (Family Meal removed from menu and footer — it is a seasonal page).
- Footer now includes Privacy Policy and Terms of Service links.
- Church address updated to 273 Dry Creek Rd, Dowelltown, TN 37059, linked to the new Google Maps location.
- First page migrated: `what-we-believe`.

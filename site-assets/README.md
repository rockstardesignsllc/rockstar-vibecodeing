# Rockstar shared site files

Served by Cloudflare Pages at https://assets.rockstarinfo.com, built from the `site-assets` branch of this repo
(output folder `site-assets`, no build command). A push to `site-assets` goes live in about a minute; browsers
pick it up within 5 minutes (`_headers`).

| File | What it does |
|---|---|
| `rockstar-master.css` | The shared look for every Rockstar HighLevel page |
| `deal-desk/` | Rockstar Deal Desk (payment calculators): `deal-desk.js`, `saved-quotes.js` and one settings file per dealer in `clients/`. Built from `payment-calculator/` on main by `build.py`; do not edit here |
| `blocks/` | Self-updating page sections (`blocks/<site>/<name>.html`). A pasted section marked `data-rs-block` is swapped for its file here when the file's `data-rs-v` is newer. Built from `pages-2027/` on the `rockstar-2027-pages` branch by `pages-2027/build-blocks.py`; do not edit here |
| `rockstar-shared.js` | Shared buttons and parts: links with `data-rs-cta="audit"`, `"meeting"` or `"booking"` take their label, link and new-tab setting from `CTAS`; menus and footers marked `data-rs-part` can be replaced from `PARTS` or get extra links from `LINKS`; sections marked `data-rs-block` update from `blocks/`, `INSERTS` adds new blocks to pages pasted before they existed, and `BANNERS` puts the scrolling banner above the menu on a site's home page |
| `img/` | Images the pages and blocks point to, such as the sample Call Coach scorecards in `img/call-coach/` |

Each HighLevel page loads them with these two lines at the top of its Custom HTML/JS element:

```html
<link rel="stylesheet" href="https://assets.rockstarinfo.com/rockstar-master.css">
<script src="https://assets.rockstarinfo.com/rockstar-shared.js" defer></script>
```

Buttons keep a working href and label in the page itself, so a page still works if this site is down.
Bump `VERSION` in `rockstar-shared.js` on every change.

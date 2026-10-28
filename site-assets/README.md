# Rockstar shared site files

Served by Cloudflare Pages at https://assets.rockstarinfo.com, built from the `site-assets` branch of this repo
(output folder `site-assets`, no build command). A push to `site-assets` goes live in about a minute; browsers
pick it up within 5 minutes (`_headers`).

| File | What it does |
|---|---|
| `rockstar-master.css` | The shared look for every Rockstar HighLevel page |
| `rockstar-shared.js` | Shared buttons and parts: links with `data-rs-cta="audit"`, `"meeting"` or `"booking"` take their label, link and new-tab setting from `CTAS`; menus and footers marked `data-rs-part` can be replaced from `PARTS` |

Each HighLevel page loads them with these two lines at the top of its Custom HTML/JS element:

```html
<link rel="stylesheet" href="https://assets.rockstarinfo.com/rockstar-master.css">
<script src="https://assets.rockstarinfo.com/rockstar-shared.js" defer></script>
```

Buttons keep a working href and label in the page itself, so a page still works if this site is down.
Bump `VERSION` in `rockstar-shared.js` on every change.

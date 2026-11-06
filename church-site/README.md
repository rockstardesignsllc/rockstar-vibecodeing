# Local Church Gathering website (`church-site/`)

Source of truth for the **localchurchgathering.com** marketing site. The live site is
hosted in GoHighLevel; this folder is where the HTML/CSS is version-controlled and edited.

This is a separate project from the Rockstar products in this repo and does **not** share
their CSS or design system.

## Layout

| Path | What it is |
|---|---|
| `site.config.json` | Shared values used on every page — address, map link, service time, phone, email, socials, the top menu and footer links. **Change these here once** and every page picks it up on the next build. |
| `styles.css` | The one shared stylesheet for every page. |
| `pages/<slug>.html` | The `<main>` inner sections for one page. Uses `{{TOKENS}}` (see below) for shared values so no page hardcodes the address or service time. |
| `pages.json` | Per-page metadata: slug, title, which embed scripts the page needs, and its mobile sticky CTA. |
| `build.py` | Assembles each page: shared header + page body + shared footer + sticky bar + scripts → `dist/<slug>.html`. |
| `dist/` | Build output. Full standalone pages, ready to preview in a browser or paste into a GoHighLevel Custom HTML element. (Generated — do not edit by hand.) |

## Tokens

Use these inside `pages/*.html` and `pages.json` instead of hardcoding; `build.py` fills them from `site.config.json`:

`{{SITE_URL}}` `{{BRAND}}` `{{TAGLINE}}` `{{SERVICE_TIME}}` `{{ADDRESS}}` `{{ADDRESS_SHORT}}`
`{{MAP_URL}}` `{{PHONE}}` `{{PHONE_TEL}}` `{{EMAIL}}` `{{GIVE_URL}}` `{{MERCH_URL}}`
`{{FACEBOOK}}` `{{INSTAGRAM}}` `{{YOUTUBE}}` `{{TIKTOK}}`

## How to make a change

1. **A shared thing** (address, service time, a menu or footer link): edit `site.config.json`.
2. **One page's content**: edit that page's `pages/<slug>.html`.
3. Rebuild: `python3 church-site/build.py`
4. The updated full page is in `dist/<slug>.html`.

## Publishing — auto-update (live)

Each GoHighLevel page carries a **one-time loader snippet** (from `loaders/<slug>.html`):

```html
<div id="lcg-app"></div>
<script src="https://assets.rockstarinfo.com/church/<slug>.js"></script>
```

The loader pulls the page's HTML, the shared CSS, the JSON-LD schema, and any form/give
embeds from `assets.rockstarinfo.com/church/`. After that snippet is pasted once per page,
**every future change here goes live with no re-paste.**

How a change reaches the live site:

1. Edit `site.config.json` or a `pages/<slug>.html` and rebuild (`python3 church-site/build.py`).
2. Commit; when it lands on `main`, `.github/workflows/church-publish.yml` builds `hosted/`
   and copies it to `church/` on the `site-assets` branch, which Cloudflare Pages serves at
   `https://assets.rockstarinfo.com/church/` (live within ~a minute, Cloudflare busts cache
   on deploy).
3. Every GoHighLevel page using the loader updates automatically.

Build outputs:
- `hosted/` — what gets published: `styles.css` + one `<slug>.js` loader per page.
- `loaders/` — the one-time snippet to paste into each GoHighLevel page (reference).
- `dist/` — full standalone pages (schema + scripts inline). Backup / paste-the-whole-page
  fallback if you ever want a page without the loader.

## Pages

`past-sermons` · `what-we-believe` · `social` · `contact-us` · `generosity` · `resources` ·
`privacy-policy` · `terms-of-service` · `/` (home) · `/meal` (seasonal — not linked in the
menu or footer) · `/worship` (utility slideshow) · Pastor Mat booking page.

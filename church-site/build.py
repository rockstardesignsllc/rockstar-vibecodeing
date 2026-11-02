#!/usr/bin/env python3
"""Build the Local Church Gathering website from shared config + page bodies.

Source of truth:
  site.config.json   address, service time, menu, footer links, socials (change here, rebuild, every page updates)
  styles.css         shared stylesheet for every page
  pages/<slug>.html  the <main> inner sections for one page, using {{TOKENS}} for shared values
  pages.json         per-page metadata (title, sticky CTA, which embed scripts a page needs)

Output:
  dist/<slug>.html   full standalone page (header + body + footer + sticky + scripts), ready to preview
                     or paste into a GoHighLevel Custom HTML element.

Run: python3 church-site/build.py
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
CONFIG = json.loads((HERE / "site.config.json").read_text())
PAGES = json.loads((HERE / "pages.json").read_text())
DIST = HERE / "dist"

FB_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>'
IG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.2"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>'
YT_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 12s0-3.2-.41-4.74a2.5 2.5 0 0 0-1.76-1.77C19.09 5.08 12 5.08 12 5.08s-7.09 0-9.03.41A2.5 2.5 0 0 0 1.2 7.26C.8 8.8.8 12 .8 12s0 3.2.41 4.74a2.5 2.5 0 0 0 1.76 1.77c1.94.41 9.03.41 9.03.41s7.09 0 9.03-.41a2.5 2.5 0 0 0 1.76-1.77C23 15.2 23 12 23 12zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>'
TT_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.3v12.2a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .53.04.77.12V9.3a5.9 5.9 0 0 0-.77-.05 5.86 5.86 0 1 0 5.86 5.86V9.01a7.55 7.55 0 0 0 4.4 1.4V7.1a4.28 4.28 0 0 1-3.31-1.28z"/></svg>'


def tokens():
    c = CONFIG
    return {
        "{{SITE_URL}}": c["siteUrl"],
        "{{BRAND}}": c["brand"],
        "{{TAGLINE}}": c["tagline"],
        "{{SERVICE_TIME}}": c["serviceTime"],
        "{{SERVICE_TIME_ONLY}}": c["serviceTimeOnly"],
        "{{ADDRESS}}": c["addressDisplay"],
        "{{ADDRESS_SHORT}}": c["addressShort"],
        "{{MAP_URL}}": c["mapUrl"],
        "{{PHONE}}": c["phone"],
        "{{PHONE_TEL}}": c["phoneTel"],
        "{{EMAIL}}": c["email"],
        "{{GIVE_URL}}": c["giveUrl"],
        "{{MERCH_URL}}": c["merchUrl"],
        "{{FACEBOOK}}": c["social"]["facebook"],
        "{{INSTAGRAM}}": c["social"]["instagram"],
        "{{YOUTUBE}}": c["social"]["youtube"],
        "{{TIKTOK}}": c["social"]["tiktok"],
    }


def fill(text):
    for k, v in tokens().items():
        text = text.replace(k, v)
    return text


def nav_link(item):
    ext = ' target="_blank" rel="noopener"' if item.get("external") else ""
    return f'      <a href="{item["href"]}"{ext}>{item["label"]}</a>'


def header():
    links = "\n".join(nav_link(i) for i in CONFIG["menu"])
    mobile = "\n".join("  " + nav_link(i).strip() for i in CONFIG["menu"])
    return f'''<!-- HEADER -->
<header class="site-header">
  <div class="site-header__inner">
    <a href="{CONFIG['siteUrl']}" class="site-brand" aria-label="Church. home">Church.</a>

    <nav class="site-nav" aria-label="Main navigation">
{links}
    </nav>

    <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="mobile-menu" type="button">
      <span></span>
      <span></span>
      <span></span>
    </button>
  </div>

  <div id="mobile-menu" class="mobile-nav" aria-hidden="true">
{mobile}
  </div>
</header>'''


def footer_link(item):
    ext = ' target="_blank" rel="noopener"' if item.get("external") else ""
    return f'            <a href="{item["href"]}"{ext}>{item["label"]}</a>'


def footer():
    c = CONFIG
    quick = "\n".join(footer_link(i) for i in c["footerQuickLinks"])
    legal = "\n".join(
        f'        <p><a href="{i["href"]}">{i["label"]}</a></p>' for i in c["legal"]
    )
    s = c["social"]
    return f'''  <!-- FOOTER -->
  <footer class="site-footer">
    <div class="site-footer__inner">

      <div class="site-footer__top">
        <div class="site-footer__brand">
          <h2 class="site-footer__title">Church.</h2>
          <p class="site-footer__text">{c['tagline']}</p>
        </div>

        <div class="site-footer__cta">
          <a href="{c['siteUrl']}/contact-us#visit-info" class="btn btn-primary">Get Connected</a>
        </div>
      </div>

      <div class="site-footer__grid">
        <div class="site-footer__column">
          <p class="site-footer__label">Visit Us</p>
          <p class="site-footer__value">
            <a href="{c['mapUrl']}" target="_blank" rel="noopener">{c['addressDisplay']}</a>
          </p>
          <p class="site-footer__value">{c['serviceTime']}</p>
        </div>

        <div class="site-footer__column">
          <p class="site-footer__label">Contact</p>
          <p class="site-footer__value"><a href="tel:{c['phoneTel']}">{c['phone']}</a></p>
          <p class="site-footer__value"><a href="mailto:{c['email']}">{c['email']}</a></p>
        </div>

        <div class="site-footer__column">
          <p class="site-footer__label">Quick Links</p>
          <div class="site-footer__links">
{quick}
          </div>
        </div>

        <div class="site-footer__column">
          <p class="site-footer__label">Connect</p>
          <div class="site-footer__social">
            <a href="{s['facebook']}" target="_blank" rel="noopener" aria-label="Facebook">{FB_SVG}</a>
            <a href="{s['instagram']}" target="_blank" rel="noopener" aria-label="Instagram">{IG_SVG}</a>
            <a href="{s['youtube']}" target="_blank" rel="noopener" aria-label="YouTube">{YT_SVG}</a>
            <a href="{s['tiktok']}" target="_blank" rel="noopener" aria-label="TikTok">{TT_SVG}</a>
          </div>
          <div class="site-footer__links site-footer__links--give">
            <a href="{c['giveUrl']}">Give Online</a>
          </div>
        </div>
      </div>

      <div class="site-footer__bottom">
        <p>© 2026 Church. All rights reserved.</p>
{legal}
        <p><a href="{c['siteUrl']}">localchurchgathering.com</a></p>
      </div>

    </div>
  </footer>'''


def sticky(meta):
    st = meta.get("sticky")
    if not st:
        return ""
    return f'''<!-- MOBILE STICKY CTA -->
<div class="sticky-cta">
  <div class="sticky-cta__info">
    <span class="sticky-cta__label">{st['label']}</span>
    <span class="sticky-cta__sub">{st['sub']}</span>
  </div>
  <a href="{st['href']}" class="btn btn-primary sticky-cta__btn">{st['btn']}</a>
</div>'''


NAV_SCRIPT = '''<script>
  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.querySelector('.nav-toggle')
    const mobileMenu = document.querySelector('.mobile-nav')

    if (toggle && mobileMenu) {
      toggle.addEventListener('click', function () {
        const isOpen = mobileMenu.classList.toggle('is-open')
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
        mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true')
      })
    }
  })
</script>'''

FORM_EMBED = '<script src="https://link.localchurchgathering.com/js/form_embed.js"></script>'


def scripts(meta):
    out = []
    if meta.get("formEmbed"):
        out.append(FORM_EMBED)
    out.append(NAV_SCRIPT)
    return "\n\n".join(out)


PREPEND_OPEN = "<!--PREPEND-->"
PREPEND_CLOSE = "<!--/PREPEND-->"


def build_page(meta):
    body = (HERE / "pages" / meta["file"]).read_text().strip()
    prepend = ""
    if body.startswith(PREPEND_OPEN):
        _, rest = body.split(PREPEND_OPEN, 1)
        prepend, body = rest.split(PREPEND_CLOSE, 1)
        prepend, body = prepend.strip(), body.strip()
    parts = [prepend, header(), "", "<main>", "", body, "", footer(), "</main>", "", sticky(meta), "", scripts(meta)]
    html = "\n".join(p for p in parts if p != "") + "\n"
    return fill(html)


def main():
    DIST.mkdir(exist_ok=True)
    for meta in PAGES:
        out = DIST / f"{meta['slug']}.html"
        out.write_text(build_page(meta))
        print(f"built {out.relative_to(HERE)}")


if __name__ == "__main__":
    main()

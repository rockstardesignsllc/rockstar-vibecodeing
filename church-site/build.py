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
import re
import shutil

HERE = pathlib.Path(__file__).resolve().parent
CONFIG = json.loads((HERE / "site.config.json").read_text())
PAGES = json.loads((HERE / "pages.json").read_text())
DIST = HERE / "dist"
HOSTED = HERE / "hosted"
LOADERS = HERE / "loaders"
ASSETS_BASE = "https://assets.rockstarinfo.com/church"

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


BOOKS = [
    ("For This Reason", "Mat & Dara Koenig", "https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/vOKVK27hJRmtIEDt0rX1/media/66170b4e09955f35b2bb1add.jpeg"),
    ("Filled Book 1: Hopeless to Hope Filled", "Dara Koenig", "https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/vOKVK27hJRmtIEDt0rX1/media/66170b4eff043e789bd7bb31.jpeg"),
    ("Filled Book 2: UnLoved to Unconditionally Loved", "Dara Koenig", "https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/vOKVK27hJRmtIEDt0rX1/media/66170b4eb97918021004436f.jpeg"),
    ("Now I See", "Mat Koenig", "https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/vOKVK27hJRmtIEDt0rX1/media/66170b4ec39a24fe8c464d6b.jpeg"),
    ("ManUP", "Mat Koenig", "https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https%3A//assets.cdn.filesafe.space/vOKVK27hJRmtIEDt0rX1/media/66170b4edb7ee5fcd1cdaf54.jpeg"),
]


def page_url(meta):
    base = CONFIG["siteUrl"]
    return base + "/" if meta["path"] == "/" else base + meta["path"]


def org_node():
    c = CONFIG
    a = c["address"]
    return {
        "@type": "Church",
        "@id": c["siteUrl"] + "/#church",
        "name": c["seoName"],
        "alternateName": c["brand"],
        "url": c["siteUrl"] + "/",
        "description": "A relaxed, family-style church serving Smithville, Tennessee. Come as you are — Sundays at 10 AM. A place to breathe, belong, and grow.",
        "telephone": "+1-" + c["phone"],
        "email": c["email"],
        "image": c["image"],
        "address": {"@type": "PostalAddress", "streetAddress": a["street"], "addressLocality": a["locality"], "addressRegion": a["region"], "postalCode": a["postal"], "addressCountry": a["country"]},
        "geo": {"@type": "GeoCoordinates", "latitude": c["geo"]["lat"], "longitude": c["geo"]["lng"]},
        "hasMap": c["mapUrl"],
        "areaServed": {"@type": "City", "name": c["areaServed"]},
        "sameAs": [c["social"]["facebook"], c["social"]["instagram"], c["social"]["youtube"], c["social"]["tiktok"]],
        "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": "https://schema.org/Sunday", "opens": "10:00", "closes": "11:00"}],
        "founder": [{"@type": "Person", "name": f["name"], "jobTitle": f["jobTitle"]} for f in c["founders"]],
    }


def website_node():
    c = CONFIG
    return {"@type": "WebSite", "@id": c["siteUrl"] + "/#website", "url": c["siteUrl"] + "/", "name": c["seoName"], "publisher": {"@id": c["siteUrl"] + "/#church"}, "inLanguage": "en-US"}


def webpage_node(meta):
    url = page_url(meta)
    return {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": meta.get("seoTitle", meta["title"]), "description": meta.get("description", ""), "isPartOf": {"@id": CONFIG["siteUrl"] + "/#website"}, "about": {"@id": CONFIG["siteUrl"] + "/#church"}, "inLanguage": "en-US", "breadcrumb": {"@id": url + "#breadcrumb"}}


def breadcrumb_node(meta):
    url = page_url(meta)
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": CONFIG["siteUrl"] + "/"}]
    if meta["path"] != "/":
        items.append({"@type": "ListItem", "position": 2, "name": meta["title"], "item": url})
    return {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": items}


def books_node():
    items = []
    for i, (name, author, img) in enumerate(BOOKS):
        items.append({"@type": "ListItem", "position": i + 1, "item": {"@type": "Book", "name": name, "author": {"@type": "Person", "name": author}, "image": img, "publisher": {"@id": CONFIG["siteUrl"] + "/#church"}}})
    return {"@type": "ItemList", "name": "Books by Mat & Dara Koenig", "itemListElement": items}


def event_node():
    c = CONFIG
    return {
        "@type": "Event",
        "@id": c["siteUrl"] + "/meal#event",
        "name": "Community Family Meal",
        "description": "A free community meal on the last Sunday of every month, right after the 10 AM gathering.",
        "eventSchedule": {"@type": "Schedule", "repeatFrequency": "P1M", "byDay": "https://schema.org/Sunday", "byMonthWeek": -1, "startTime": "11:15", "duration": "PT1H30M", "scheduleTimezone": "America/Chicago"},
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {"@id": c["siteUrl"] + "/#church"},
        "organizer": {"@id": c["siteUrl"] + "/#church"},
        "image": c["image"],
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "url": c["siteUrl"] + "/meal"},
    }


def person_node():
    c = CONFIG
    return {
        "@type": "Person",
        "@id": c["siteUrl"] + "/#mat-koenig",
        "name": "Mat Koenig",
        "jobTitle": "Pastor",
        "worksFor": {"@id": c["siteUrl"] + "/#church"},
        "image": c["image"],
        "url": c["siteUrl"] + "/pastor-mat",
    }


def schema_json(meta):
    graph = [org_node(), website_node(), webpage_node(meta), breadcrumb_node(meta)]
    if meta.get("schema") == "books":
        graph.append(books_node())
    if meta["slug"] == "meal":
        graph.append(event_node())
    if meta["slug"] == "pastor-mat":
        graph.append(person_node())
    data = {"@context": "https://schema.org", "@graph": graph}
    return json.dumps(data, indent=2, ensure_ascii=False)


def schema_block(meta):
    return '<script type="application/ld+json">\n' + schema_json(meta) + "\n</script>"


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


def read_body(meta):
    body = (HERE / "pages" / meta["file"]).read_text().strip()
    prepend = ""
    if body.startswith(PREPEND_OPEN):
        _, rest = body.split(PREPEND_OPEN, 1)
        prepend, body = rest.split(PREPEND_CLOSE, 1)
        prepend, body = prepend.strip(), body.strip()
    return prepend, body


def stamp_comment(meta):
    return f'<!-- {CONFIG["seoName"]} ({CONFIG["brand"]}) — {meta["slug"]} — v{CONFIG["version"]} · updated {CONFIG["updated"]} -->'


def build_page(meta):
    """Full standalone page (dist/) — paste-the-whole-thing fallback / backup."""
    prepend, body = read_body(meta)
    parts = [stamp_comment(meta), prepend, header(), "", "<main>", "", body, "", footer(), "</main>", "", sticky(meta), "", schema_block(meta), "", scripts(meta)]
    return fill("\n".join(p for p in parts if p != "") + "\n")


def visible_html(meta):
    """Markup only (no <script> tags) — what the hosted loader injects."""
    prepend, body = read_body(meta)
    parts = [prepend, header(), "", "<main>", "", body, "", footer(), "</main>", "", sticky(meta)]
    html = fill("\n".join(p for p in parts if p != ""))
    return re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)


def build_loader(meta):
    """The JS served at assets.rockstarinfo.com/church/<slug>.js — injects CSS + HTML + schema + embeds."""
    forms = "add('https://link.localchurchgathering.com/js/form_embed.js');" if meta.get("formEmbed") else ""
    tith = "add('https://static.tithely.com/give/give.js');" if meta["slug"] == "generosity" else ""
    return (
        f"/* {CONFIG['seoName']} — {meta['slug']} — v{CONFIG['version']} · {CONFIG['updated']} */\n"
        "(function(){\n"
        f"  var A='{ASSETS_BASE}';\n"
        f"  if(!document.getElementById('lcg-css')){{var l=document.createElement('link');l.id='lcg-css';l.rel='stylesheet';l.href=A+'/styles.css?v={CONFIG['version']}';document.head.appendChild(l);}}\n"
        "  var mount=document.getElementById('lcg-app'); if(!mount){return;}\n"
        "  mount.innerHTML=" + json.dumps(visible_html(meta)) + ";\n"
        "  var ld=" + json.dumps(schema_json(meta)) + ";\n"
        "  if(ld){var s=document.createElement('script');s.type='application/ld+json';s.text=ld;document.head.appendChild(s);}\n"
        "  var t=mount.querySelector('.nav-toggle'),m=mount.querySelector('.mobile-nav');\n"
        "  if(t&&m){t.addEventListener('click',function(){var o=m.classList.toggle('is-open');t.setAttribute('aria-expanded',o?'true':'false');m.setAttribute('aria-hidden',o?'false':'true');});}\n"
        "  function add(src){var e=document.createElement('script');e.src=src;e.async=true;document.body.appendChild(e);}\n"
        f"  {forms}\n"
        f"  {tith}\n"
        "})();\n"
    )


def loader_snippet(meta):
    return (
        f"<!-- {CONFIG['seoName']} — {meta['slug']} — paste once into this page's Custom HTML. Future updates are automatic. -->\n"
        '<div id="lcg-app"></div>\n'
        f'<script src="{ASSETS_BASE}/{meta["slug"]}.js"></script>\n'
    )


def main():
    for d in (DIST, HOSTED, LOADERS):
        d.mkdir(exist_ok=True)
    # Shared stylesheet served from the asset host.
    shutil.copyfile(HERE / "styles.css", HOSTED / "styles.css")
    for meta in PAGES:
        (DIST / f"{meta['slug']}.html").write_text(build_page(meta))
        (HOSTED / f"{meta['slug']}.js").write_text(build_loader(meta))
        (LOADERS / f"{meta['slug']}.html").write_text(loader_snippet(meta))
        print(f"built {meta['slug']}: dist + hosted/{meta['slug']}.js + loader")
    print(f"done — {len(PAGES)} pages")


if __name__ == "__main__":
    main()

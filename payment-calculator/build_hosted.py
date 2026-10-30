#!/usr/bin/env python3
"""Build the hosted (live-updating) version of Rockstar Deal Desk.

Reads the pages build.py just made in rockstar-master/ and writes:
  hosted/deal-desk/deal-desk.js        dealer page + customer quote page engine
  hosted/deal-desk/saved-quotes.js     saved quotes page engine
  hosted/deal-desk/clients/<slug>.json one settings file per calculator (from <slug>/config.json)
  <slug>/ghl/*.html                    the short loader snippets pasted into HighLevel once
  hosted/deal-desk/offers/             factory offers (build_offers.py)

hosted/deal-desk/ is copied to the site-assets branch (site-assets/deal-desk/), which Cloudflare Pages
serves at https://assets.rockstarinfo.com/deal-desk/. After that, every change goes live on every
HighLevel page that uses a loader, with no re-paste.

Run by build.py. Run alone: python3 payment-calculator/build_hosted.py
"""
import datetime
import json
import pathlib
import re

import build_offers

HERE = pathlib.Path(__file__).resolve().parent
MASTER = HERE / 'rockstar-master'
OUT = HERE / 'hosted' / 'deal-desk'
BASE_URL = 'https://assets.rockstarinfo.com/deal-desk'

# Settings the hosted engine must never inherit from the Rockstar master page.
# Each calculator's own settings file supplies them.
BLANK_IN_ENGINE = ['webhookUrl', 'quoteStoreUrl', 'dealerName', 'dealerEmail', 'dealerLogo', 'accentColor']

MASTER_SETTINGS = {
    'label': 'Rockstar master',
    'calculatorType': 'standard',
    'webhookUrl': 'https://services.leadconnectorhq.com/hooks/hrsRmtnUmvqCKm3d01tx/webhook-trigger/f8871865-32b0-4dd6-8cba-cf263ce8873f',
    'quoteStoreUrl': 'https://rockstar-deal-desk-quotes.rockstar-designs-llc.workers.dev/quotes',
}


def parts(html, label):
    """Split a page into (css, main script) — the first <style> block and the last <script> block."""
    css = re.search(r'<style>\n(.*?)</style>', html, re.S)
    scripts = re.findall(r'<script>\n(.*?)</script>', html, re.S)
    if not css or len(scripts) < 2:
        raise SystemExit(f'build_hosted: could not split {label}')
    return css.group(1), scripts[-1]


def blank_engine_settings(script, label):
    for key in BLANK_IN_ENGINE:
        script = re.sub(r"(\n    %s:\s*)'[^']*'" % key, r"\1''", script, count=1)
    # After CONFIG closes, take this calculator's settings from its hosted settings file.
    script, n = re.subn(r'(\n  const CONFIG = \{.*?\n  \};)',
                        r"\1\n  Object.assign(CONFIG, (window.__RSDD && window.__RSDD.cfg) || {});",
                        script, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'build_hosted: CONFIG block not found in {label}')
    return script


def engine(css, script, root_id, default_mode, version, label):
    """Wrap the page code so it waits for the calculator's settings file before drawing."""
    return f'''/* Rockstar Deal Desk v{version} | {label} | hosted engine
   Served from {BASE_URL}/ . Built by payment-calculator/build_hosted.py. Do not edit here. */
(function () {{
  var root = document.getElementById('{root_id}');
  if (!root || root.dataset.rsddStarted) return;
  root.dataset.rsddStarted = '1';
  var BASE = '{BASE_URL}';
  var client = (root.dataset.client || 'rockstar-master').replace(/[^a-z0-9-]/g, '');
  var mode = root.dataset.mode || '{default_mode}';

  function fail(msg) {{
    root.innerHTML = '<div style="font:15px/1.5 Arial,sans-serif;max-width:640px;margin:40px auto;padding:20px 24px;border:2px solid #d70015;border-radius:14px;color:#0b0b0d"><b>This page did not finish loading.</b><br>' + msg + '</div>';
  }}

  if (!document.getElementById('rsdd-css-{root_id}')) {{
    var st = document.createElement('style');
    st.id = 'rsdd-css-{root_id}';
    st.textContent = {json.dumps(css)};
    document.head.appendChild(st);
  }}

  function start(cfg) {{
    window.__RSDD = {{ cfg: cfg, mode: mode, client: client }};
{script.replace("const PAGE_MODE = 'builder';", "const PAGE_MODE = (window.__RSDD && window.__RSDD.mode) || 'builder';")}
  }}

  fetch(BASE + '/clients/' + client + '.json', {{ cache: 'no-cache' }})
    .then(function (r) {{ if (!r.ok) throw new Error('settings ' + r.status); return r.json(); }})
    .then(function (cfg) {{ delete cfg.label; start(cfg); }})
    .catch(function (e) {{ fail('The calculator settings for "' + client + '" could not be loaded (' + (e && e.message) + '). Refresh the page. If it keeps happening, tell Rockstar support.'); }});
}})();
'''


def loader(slug, label, kind, version, stamp):
    if kind == 'saved':
        root_id, mode, src, what = 'rsq', '', 'saved-quotes.js', 'SAVED QUOTES PAGE (for example /saved-quotes)'
    else:
        root_id = 'rsec'
        mode = 'builder' if kind == 'dealer' else 'offer'
        src = 'deal-desk.js'
        what = 'DEALER CALCULATOR PAGE' if kind == 'dealer' else 'CUSTOMER QUOTE PAGE (/quote)'
    mode_attr = f' data-mode="{mode}"' if mode else ''
    return f'''<!-- Rockstar page v{version} | Updated {stamp} -->
<!--
  Rockstar Deal Desk ({label})  |  {what}  |  live loader
  Paste this whole snippet into the page's Custom HTML/JS element ONE time.
  The calculator itself loads from assets.rockstarinfo.com, so future updates go live here automatically.
-->
<div id="{root_id}" data-client="{slug}"{mode_attr}></div>
<script>
setTimeout(function () {{
  var el = document.getElementById('{root_id}');
  if (el && !el.children.length) el.innerHTML = '<div style="font:15px/1.5 Arial,sans-serif;max-width:640px;margin:40px auto;padding:20px 24px;border:2px solid #d70015;border-radius:14px;color:#0b0b0d"><b>This page did not finish loading.</b><br>Check your connection and refresh. If it keeps happening, tell Rockstar support.</div>';
}}, 8000);
</script>
<script src="{BASE_URL}/{src}"></script>
'''


def main():
    version = re.search(r'^## v(\d+(?:\.\d+)+)\s*$', (HERE / 'CHANGELOG.md').read_text(), re.M).group(1)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    (OUT / 'clients').mkdir(parents=True, exist_ok=True)

    css, script = parts((MASTER / 'dealer-page.html').read_text(), 'dealer-page.html')
    (OUT / 'deal-desk.js').write_text(engine(css, blank_engine_settings(script, 'dealer-page.html'), 'rsec', 'builder', version, 'dealer and quote pages'))
    css, script = parts((MASTER / 'saved-quotes.html').read_text(), 'saved-quotes.html')
    (OUT / 'saved-quotes.js').write_text(engine(css, blank_engine_settings(script, 'saved-quotes.html'), 'rsq', '', version, 'saved quotes page'))

    clients = {'rockstar-master': MASTER_SETTINGS}
    for cfg_path in sorted(HERE.glob('*/config.json')):
        clients[cfg_path.parent.name] = json.loads(cfg_path.read_text())

    built = ['hosted/deal-desk/deal-desk.js', 'hosted/deal-desk/saved-quotes.js']
    for slug, cfg in clients.items():
        (OUT / 'clients' / f'{slug}.json').write_text(json.dumps(cfg, indent=2) + '\n')
        ghl = HERE / slug / 'ghl'
        ghl.mkdir(exist_ok=True)
        for kind, name in (('dealer', 'dealer-page.html'), ('quote', 'quote-page.html'), ('saved', 'saved-quotes.html')):
            path = ghl / name
            new = loader(slug, cfg.get('label', slug), kind, version, stamp)
            # Keep the old stamp when nothing but the time would change, so re-runs don't churn the files.
            if path.exists() and re.sub(r'Updated [^>]*-->', '', path.read_text()) == re.sub(r'Updated [^>]*-->', '', new):
                continue
            path.write_text(new)
        built.append(f'clients/{slug}.json + {slug}/ghl/')
    print(f'hosted v{version}: ' + ', '.join(built))
    build_offers.main()


if __name__ == '__main__':
    main()

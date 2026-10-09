#!/usr/bin/env python3
"""Build the calculator pages from dealer-page.html, the single source.

1. Stamps the version from the newest "## vX.Y" heading in CHANGELOG.md into dealer-page.html.
2. Generates quote-page.html from dealer-page.html (customer header, PAGE_MODE 'offer').
3. Generates every client build in clients/<slug>/ from clients/<slug>/config.json.

Run from anywhere: python3 embeds/highlevel/build.py
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
CONFIG_KEYS = ['dealerName', 'dealerEmail', 'dealerLogo', 'accentColor', 'webhookUrl', 'calculatorType', 'headerColor', 'quotePagePath']
QUOTE_HEADER = '''<!--
  RockstarAI Engagement Calculator v{version}  |  FILE 2 of 2: CUSTOMER RESULTS PAGE
  Paste this into a GHL "Custom HTML/JS" element on your /quote page
  (must match CONFIG.quotePagePath in file 1).
  This is the "Here's your personalized vehicle offer" page your customer sees,
  and the page your salesperson opens at the desk.
  Give this page customer friendly SEO and social sharing settings. Link previews read them.

  DEALERS PASTING THIS ON THEIR OWN WEBSITE: fill in CONFIG (inside the script) the same way in BOTH files.
-->'''


def sub_once(pattern, repl, text, label):
    out, n = re.subn(pattern, repl, text, count=1)
    if n != 1:
        raise SystemExit(f'build: could not find {label}')
    return out


def main():
    version = re.search(r'^## v(\d+(?:\.\d+)+)\s*$', (HERE / 'CHANGELOG.md').read_text(), re.M)
    if not version:
        raise SystemExit('build: no "## vX.Y" heading in CHANGELOG.md')
    version = version.group(1)

    dealer_path = HERE / 'dealer-page.html'
    dealer = dealer_path.read_text()
    dealer = sub_once(r'RockstarAI Engagement Calculator v[\d.]+  \|', f'RockstarAI Engagement Calculator v{version}  |', dealer, 'dealer header version')
    dealer = sub_once(r"const VERSION = '[\d.]+';", f"const VERSION = '{version}';", dealer, 'VERSION constant')
    dealer_path.write_text(dealer)

    body = dealer.split('-->', 1)[1]
    if body.count("const PAGE_MODE = 'builder';") != 1:
        raise SystemExit('build: PAGE_MODE builder line not found exactly once')
    quote = QUOTE_HEADER.format(version=version) + body.replace("const PAGE_MODE = 'builder';", "const PAGE_MODE = 'offer';")
    (HERE / 'quote-page.html').write_text(quote)
    built = ['dealer-page.html', 'quote-page.html']

    for cfg_path in sorted((HERE / 'clients').glob('*/config.json')):
        cfg = json.loads(cfg_path.read_text())
        for name, source in (('dealer-page.html', dealer), ('quote-page.html', quote)):
            out = source
            for key in CONFIG_KEYS:
                if key in cfg:
                    value = cfg[key].replace('\\', '\\\\').replace("'", "\\'")
                    out = sub_once(r"(\n    %s:\s*)'[^']*'" % key, lambda m: m.group(1) + "'" + value + "'", out, f'{cfg_path.parent.name} {key}')
            out = sub_once(r'(RockstarAI Engagement Calculator v[\d.]+)  \|', r'\1 (%s)  |' % cfg['label'], out, 'client label')
            (cfg_path.parent / name).write_text(out)
            built.append(f'clients/{cfg_path.parent.name}/{name}')

    print(f'built v{version}: ' + ', '.join(built))


if __name__ == '__main__':
    main()

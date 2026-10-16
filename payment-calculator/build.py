#!/usr/bin/env python3
"""Build the calculator pages from rockstar-master/dealer-page.html, the single source.

1. Stamps the version from the newest "## vX.Y" heading in CHANGELOG.md into rockstar-master/dealer-page.html.
2. Generates rockstar-master/quote-page.html from it (customer header, PAGE_MODE 'offer').
3. Generates every client build in <slug>/ from <slug>/config.json.

Run from anywhere: python3 payment-calculator/build.py
Pass client folder names to rebuild only those clients, or --master-only to leave every client build as it is:
  python3 payment-calculator/build.py --master-only
  python3 payment-calculator/build.py kelly-ford wildcat-used-cars
"""
import json
import sys
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
MASTER = HERE / 'rockstar-master'
CONFIG_KEYS = ['dealerName', 'dealerEmail', 'dealerLogo', 'accentColor', 'webhookUrl', 'calculatorType', 'headerColor',
               'paymentLayout', 'gridTerms', 'gridDownPayments', 'fixedRate', 'rateDisplay', 'quoteStoreUrl', 'quotePagePath']
QUOTE_HEADER = '''<!--
  Rockstar Deal Desk v{version}  |  FILE 2 of 2: CUSTOMER RESULTS PAGE
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


def main(args):
    master_only = '--master-only' in args
    clients = [a for a in args if not a.startswith('--')]
    for slug in clients:
        if not (HERE / slug / 'config.json').is_file():
            raise SystemExit(f'build: no {slug}/config.json')
    version = re.search(r'^## v(\d+(?:\.\d+)+)\s*$', (HERE / 'CHANGELOG.md').read_text(), re.M)
    if not version:
        raise SystemExit('build: no "## vX.Y" heading in CHANGELOG.md')
    version = version.group(1)

    dealer_path = MASTER / 'dealer-page.html'
    dealer = dealer_path.read_text()
    dealer = sub_once(r'Rockstar Deal Desk v[\d.]+  \|', f'Rockstar Deal Desk v{version}  |', dealer, 'dealer header version')
    dealer = sub_once(r"const VERSION = '[\d.]+';", f"const VERSION = '{version}';", dealer, 'VERSION constant')
    dealer_path.write_text(dealer)

    body = dealer.split('-->', 1)[1]
    if body.count("const PAGE_MODE = 'builder';") != 1:
        raise SystemExit('build: PAGE_MODE builder line not found exactly once')
    quote = QUOTE_HEADER.format(version=version) + body.replace("const PAGE_MODE = 'builder';", "const PAGE_MODE = 'offer';")
    (MASTER / 'quote-page.html').write_text(quote)
    built = ['rockstar-master/dealer-page.html', 'rockstar-master/quote-page.html']

    for cfg_path in sorted(HERE.glob('*/config.json')):
        if master_only or (clients and cfg_path.parent.name not in clients):
            continue
        cfg = json.loads(cfg_path.read_text())
        for name, source in (('dealer-page.html', dealer), ('quote-page.html', quote)):
            out = source
            for key in CONFIG_KEYS:
                if key in cfg:
                    value = cfg[key].replace('\\', '\\\\').replace("'", "\\'")
                    out = sub_once(r"(\n    %s:\s*)'[^']*'" % key, lambda m: m.group(1) + "'" + value + "'", out, f'{cfg_path.parent.name} {key}')
            out = sub_once(r'(Rockstar Deal Desk v[\d.]+)  \|', r'\1 (%s)  |' % cfg['label'], out, 'client label')
            (cfg_path.parent / name).write_text(out)
            built.append(f'{cfg_path.parent.name}/{name}')

    print(f'built v{version}: ' + ', '.join(built))


if __name__ == '__main__':
    main(sys.argv[1:])

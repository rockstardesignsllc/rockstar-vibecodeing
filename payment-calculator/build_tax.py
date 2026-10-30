#!/usr/bin/env python3
"""Build the tax data the Deal Desk loads from assets.rockstarinfo.com/deal-desk/tax/.

Reads:
  tax/state-rules.json                       vehicle tax rules per state (hand-maintained)
  <rates folder>/TAXRATES_ZIP5_<ST><YYYYMM>.csv  ZIP rate tables (repo folder tax-rates/, one file per state)

Writes hosted/deal-desk/tax/:
  rules.json     the state rules plus the rate table vintage
  prefix.json    first 3 ZIP digits -> list of states (to find the state when the customer's state is blank)
  zip/<ST>.json  ZIP -> [combined rate, state rate, tax region name] (local = combined - state)

Run: python3 payment-calculator/build_tax.py [rates folder]   (default: ../tax-rates next to payment-calculator)
"""
import collections
import csv
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'hosted' / 'deal-desk' / 'tax'


def main(args):
    src = pathlib.Path(args[0]) if args else HERE.parent / 'tax-rates'
    files = sorted(src.glob('TAXRATES_ZIP5_*.csv'))
    if not files:
        raise SystemExit(f'build_tax: no TAXRATES_ZIP5_*.csv files in {src}')
    rules = json.loads((HERE / 'tax' / 'state-rules.json').read_text())
    (OUT / 'zip').mkdir(parents=True, exist_ok=True)
    prefix = collections.defaultdict(set)
    vintage = set()
    count = 0
    for f in files:
        m = re.match(r'TAXRATES_ZIP5_([A-Z]{2})(\d{6})\.csv$', f.name)
        if not m:
            continue
        state, ym = m.groups()
        vintage.add(ym)
        zips = {}
        for r in csv.DictReader(f.open(newline='')):
            zips[r['ZipCode'].zfill(5)] = [round(float(r['EstimatedCombinedRate'] or 0), 6), round(float(r['StateRate'] or 0), 6), r['TaxRegionName'].strip()]
            prefix[r['ZipCode'].zfill(5)[:3]].add(state)
        (OUT / 'zip' / f'{state}.json').write_text(json.dumps(zips, separators=(',', ':')))
        count += len(zips)
    rules['_rates'] = 'ZIP rate tables ' + ', '.join(sorted(vintage))
    (OUT / 'rules.json').write_text(json.dumps(rules, separators=(',', ':')))
    (OUT / 'prefix.json').write_text(json.dumps({p: sorted(s) for p, s in sorted(prefix.items())}, separators=(',', ':')))
    print(f'tax: {len(files)} states, {count} ZIPs, rates {", ".join(sorted(vintage))}')


if __name__ == '__main__':
    main(sys.argv[1:])

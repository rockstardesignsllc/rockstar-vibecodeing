#!/usr/bin/env python3
"""Build the factory offers the Deal Desk loads from assets.rockstarinfo.com/deal-desk/offers/.

Reads:
  offers/brands.json        brand names and the makes that map to them
  offers/data/<brand>.json  approved offers, written by offers/collect.mjs and merged by pull request

Writes hosted/deal-desk/offers/:
  index.json      make -> brand lookup, and which brands have offers on file
  <brand>.json    that brand's offers

Run by build_hosted.py, and by the publish workflow after an offers pull request merges.
Run alone: python3 payment-calculator/build_offers.py
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / 'offers'
OUT = HERE / 'hosted' / 'deal-desk' / 'offers'
PUBLIC_KEYS = ['brand', 'name', 'updated', 'offers']


def main():
    brands = json.loads((SRC / 'brands.json').read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    index = {'brands': {}}
    for slug, brand in brands.items():
        entry = {'name': brand['name'], 'makes': brand['makes']}
        data_path = SRC / 'data' / f'{slug}.json'
        if data_path.exists():
            data = json.loads(data_path.read_text())
            (OUT / f'{slug}.json').write_text(json.dumps({k: data[k] for k in PUBLIC_KEYS}, separators=(',', ':')))
            entry['updated'] = data['updated']
            entry['count'] = len(data['offers'])
        index['brands'][slug] = entry
    (OUT / 'index.json').write_text(json.dumps(index, separators=(',', ':')))
    on_file = [s for s, b in index['brands'].items() if 'count' in b]
    print(f'offers: {len(brands)} brands, {len(on_file)} with offers on file' + (f' ({", ".join(on_file)})' if on_file else ''))


if __name__ == '__main__':
    main()

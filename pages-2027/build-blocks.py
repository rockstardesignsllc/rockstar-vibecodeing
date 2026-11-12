"""Copy every self-updating block out of the pasted pages into the site-assets folder.

Usage: python3 pages-2027/build-blocks.py <path to the site-assets folder of the site-assets branch>

A block is everything between `<!-- rs-block:start <site>/<name> -->` and `<!-- rs-block:end -->` in a page file.
It is written to <site-assets>/blocks/<site>/<name>.html and served at
https://assets.rockstarinfo.com/blocks/<site>/<name>.html. rockstar-shared.js swaps it into the live page when its
data-rs-v is newer than the pasted copy, so bump data-rs-v (and the page version stamp) on every change.
"""
import pathlib, re, sys

here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]) / 'blocks'
pat = re.compile(r'<!-- rs-block:start ([a-z0-9-]+/[a-z0-9-]+) -->\n(.*?)[ \t]*<!-- rs-block:end -->', re.S)
seen = {}
for f in sorted(here.glob('*/*.html')):
    for name, body in pat.findall(f.read_text()):
        if name in seen:
            sys.exit(f'{name} is in both {seen[name]} and {f}')
        seen[name] = f
        v = re.search(r'data-rs-v="([\d.]+)"', body).group(1)
        dest = out / f'{name}.html'
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(f'<!-- {name} v{v}, copied from pages-2027/{f.relative_to(here)} by build-blocks.py -->\n{body}')
        print(f'{name} v{v} <- {f.relative_to(here)}')

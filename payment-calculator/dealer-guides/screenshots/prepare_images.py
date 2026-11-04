#!/usr/bin/env python3
"""Turn raw captures (OUT_DIR from capture.js) into the JPEGs in ../img used by build_guides.py."""
import os, sys, pathlib
from PIL import Image
src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/guide-shots')
dst = pathlib.Path(__file__).resolve().parent.parent / 'img'
crops = {'s2-list': (0, 0, 2560, 1090), 's1-login': (0, 0, 2560, 1200)}
for f in src.glob('*.png'):
    if '-full' in f.name: continue
    kind, name = f.stem.split('-', 1)
    im = Image.open(f).convert('RGB')
    if name in crops: im = im.crop(crops[name])
    if f.stem == 'ps-d05d-offers': im = im.crop((0, 0, im.width, 530))
    maxw = 1400 if name in crops else 1100
    if im.width > maxw: im = im.resize((maxw, int(im.height * maxw / im.width)), Image.LANCZOS)
    if f.stem == 'ps-d05-pricing': im = im.crop((0, 0, im.width, 1282))  # stop above the offers box
    im.save(dst / (f.stem + '.jpg'), 'JPEG', quality=82, optimize=True)

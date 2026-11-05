# Dealer calculator guides

Dealer-facing PDF instructions for the three calculator types: standard, sub-prime and powersports (Deal Desk).
Master copies are in `master/` (placeholders for dealer name, logo and web address).

## Make a guide for one dealer

    python3 build_guides.py --kind standard --dealer "Kelly Ford" --logo path/to/logo.png \
        --site kellyford.rockstarcrm.app --out kelly-ford-calculator-guide.pdf --outdir /tmp/guides

`--kind` is `standard`, `subprime` or `powersports`. Leave it out to build all three.
Bump `GUIDE_VERSION` in `build_guides.py` when the text changes; every page footer carries the version and UTC build time.

## Refresh the screenshots after a calculator change

The screenshots come from the live engine with fake dealer settings (`screenshots/guide-*.json`, "Your Dealership" and a "YOUR LOGO HERE" logo). No real webhooks or quote store calls are made: the harness blocks them.

1. Copy the `site-assets/deal-desk/` folder from the `site-assets` branch to `/tmp/sa/site-assets/deal-desk/` (or set `SA_DIR`), and copy `screenshots/guide-*.json` into its `clients/` folder.
2. `cd screenshots && for k in std sub ps; do node capture.cjs $k; done` (Playwright; writes to `/tmp/guide-shots` or `OUT_DIR`).
3. `python3 screenshots/prepare_images.py /tmp/guide-shots`, then rebuild the PDFs.

Support contact on the last page: support@mail.rockstarinfo.com.

## Dealer copies made so far

| Dealer | Kind | Command |
|---|---|---|
| Kelly Ford | standard | Shoot with `GUIDE_CLIENT=guide-kelly-ford node capture.cjs std` (OUT_DIR=/tmp/kf-shots), `python3 screenshots/prepare_images.py /tmp/kf-shots /tmp/kf-img`, then `python3 build_guides.py --kind standard --dealer "Kelly Ford" --logo dealers/kelly-ford/kelly-logo.png --site kellyford.rockstarcrm.app --img-dir /tmp/kf-img --accent "#003478" --out kelly-ford-payment-calculator-guide-v1.1.pdf` |

For a dealer copy, make `screenshots/guide-<slug>.json` from the dealer's `clients/<slug>.json` with the webhook swapped for `https://hooks.example.test/webhook` and the logo as a data URI (the sandbox cannot reach the HighLevel media CDN). The Kelly Ford logo was cropped from its social sharing image.

# New calculator checklist

Use this whenever the user asks for a new calculator ("let's build a new calculator", "build a calculator for my client", or similar).

## Ask first, in this order, and wait for the answers

1. **Is this a standard calculator or subprime?**
2. **What is the HighLevel webhook URL?**
3. **Did you attach the logo?** It is used on the pages and in the social sharing images.
4. **What is the dealer's website URL?** Use it to match their colors. If the site cannot be reached from the session, take the colors from the logo and say so.
5. **Adjustable or Multi-Payment grid?**
   - Adjustable: the customer slides the payment, down payment and term.
   - Multi-Payment grid: the customer picks from 9 payments. If they choose grid, also ask:
     - the fixed rate, and whether it is shown or hidden
     - the 3 terms (each one of 24, 36, 48, 60, 72, 84)
     - the 3 down payments
6. **What is the dealer's subdomain?** For example `kellyford.rockstarcrm.app`. Their pages live at `/home`, `/quote` and `/saved-quotes` on it.

## Already decided (do not ask again)

- **Salesperson notification email:** always typed in by the salesperson on first use. Never hardcode it.
- **Social sharing images:** always make both, 1200×630, using the dealer logo.
  - The customer image has no Rockstar mark.
  - The dealer image shows "Powered by RockstarAI".
- **Terms:** 24 to 84 months.
- **Starting down payment:** $1,000.
- **Rebate field:** keep it. It stays hidden when blank.

## Standard vs subprime

| | Standard | Subprime |
|---|---|---|
| Lease option | Yes | No (dealer and customer pages) |
| Credit score slider | Yes | No (dealer and customer pages) |
| Rate options | Credit score slider, Fixed, Hidden | Fixed, Hidden (Hidden is the default) |
| Disclaimer | Standard | Adds "All payments are subject to lender approval." |

## How to build one

1. Create `<slug>/config.json` (one folder per calculator, next to `rockstar-master/`). Keys:
   - `label`
   - `calculatorType` (`standard` or `subprime`)
   - `dealerName`
   - `dealerLogo` (a HighLevel media URL, or a compressed data URI made from the attached logo)
   - `accentColor`
   - `headerColor` (optional; set it to the logo's background color when the logo is on a dark background)
   - `webhookUrl`
   - `quoteStoreUrl`: `https://rockstar-deal-desk-quotes.rockstar-designs-llc.workers.dev/quotes`
   - Grid builds only:
     - `paymentLayout: "grid"`
     - `gridTerms` (example `"48,60,72"`)
     - `gridDownPayments` (example `"1000,2000,3000"`)
     - `fixedRate` (example `"14.99"`)
     - `rateDisplay` (`"shown"` or `"hidden"`)

     These keys are starting values only. The dealer can still change them on the dealer page.

   Locked keys are hidden on the dealer page and never travel in links.
2. Add the dealer's subdomain (`https://<subdomain>`) to `ALLOWED_ORIGINS` in `quote-store/wrangler.jsonc` and redeploy the quote store (see `quote-store/README.md`). Without it, their quotes are not saved.
3. Add a `## vX.Y` entry to `CHANGELOG.md`, then run `python3 payment-calculator/build.py`. It also builds `<slug>/saved-quotes.html`.
4. Test the dealer and quote pages, and look at the screenshots.
5. Render `<slug>/social-share-customer.png` and `social-share-dealer.png`.
6. Publish the live files: copy `hosted/deal-desk/` to `site-assets/deal-desk/` on the `site-assets` branch and push it (live at `https://assets.rockstarinfo.com/deal-desk/` in about a minute).
7. Update the Code Locker artifact with the three short loaders in `<slug>/ghl/` (the dealer pastes these, not the full pages), commit, and push.
8. Tell the user the dealer's saved quotes link (`https://<subdomain>/saved-quotes`). The dealer's access code needs no setup: it is worked out from the dealer name. The user gets it by signing in to any saved quotes page with the admin code, typing the dealer name exactly as in `dealerName`, and pressing "Show code".

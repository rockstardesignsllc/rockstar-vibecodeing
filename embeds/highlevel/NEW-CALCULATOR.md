# New calculator checklist

Use this whenever the user asks for a new calculator ("let's build a new calculator", "build a calculator for my client", or similar).

## Ask first, in this order, and wait for the answers

1. **Is this a standard calculator or subprime?**
2. **What is the HighLevel webhook URL?**
3. **Did you attach the logo?** It is used on the pages and in the social sharing images.
4. **What is the dealer's website URL?** Use it to match their colors. If the site cannot be reached from the session, take the colors from the logo and say so.

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

1. Create `clients/<slug>/config.json`. Keys:
   - `label`
   - `calculatorType` (`standard` or `subprime`)
   - `dealerName`
   - `dealerLogo` (a HighLevel media URL, or a compressed data URI made from the attached logo)
   - `accentColor`
   - `headerColor` (optional; set it to the logo's background color when the logo is on a dark background)
   - `webhookUrl`

   Locked keys are hidden on the dealer page and never travel in links.
2. Add a `## vX.Y` entry to `CHANGELOG.md`, then run `python3 embeds/highlevel/build.py`.
3. Test the dealer and quote pages, and look at the screenshots.
4. Render `clients/<slug>/social-share-customer.png` and `social-share-dealer.png`.
5. Update the Code Locker artifact, commit, and push.

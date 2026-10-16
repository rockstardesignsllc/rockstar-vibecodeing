# Rockstar Deal Desk quote store

A small Cloudflare Worker that saves every quote to R2 in one folder per dealer:

```
rockstar-deal-desk-quotes/
  kelly-ford/
    10-16-2026-Jane-Doe-A1234-Ford-F150.json
```

The pages save a quote when the customer or desking link is copied, when the offer is printed, and when the
customer locks in a payment or a lease. A later save of the same quote name replaces the file, so it holds the
newest version of that deal. Each file has every webhook field, including `offer_url`, which reopens the quote.

## Deploy (one time)

Needs a Cloudflare API token with Workers Scripts Edit and Workers R2 Storage Edit, in `CLOUDFLARE_API_TOKEN`,
and the account ID in `CLOUDFLARE_ACCOUNT_ID`.

```bash
cd payment-calculator/quote-store
npx wrangler@4 r2 bucket create rockstar-deal-desk-quotes
npx wrangler@4 r2 bucket lifecycle add rockstar-deal-desk-quotes delete-after-90-days --expire-days 90 --force
npx wrangler@4 deploy --var ALLOWED_ORIGINS:"https://<dealer page host>,https://<quote page host>"
```

Then put the Worker URL plus `/quotes` in `quoteStoreUrl` in the master CONFIG and rebuild.

## Finding a quote

Cloudflare dashboard, R2, `rockstar-deal-desk-quotes`, then the dealer's folder. Files are deleted 90 days after
they were last saved, by the bucket's lifecycle rule.

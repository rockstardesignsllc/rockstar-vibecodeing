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
npx wrangler@4 deploy --var ALLOWED_ORIGINS:"https://<dealer page host>,https://<quote page host>,https://<saved quotes page host>"
openssl rand -hex 24 | npx wrangler@4 secret put QUOTE_ADMIN_SECRET
```

Keep the `QUOTE_ADMIN_SECRET` value somewhere safe. It is the admin code for the saved quotes page, and every
dealer's access code is worked out from it. Changing it changes every dealer's code.

Then put the Worker URL plus `/quotes` in `quoteStoreUrl` in the master CONFIG and rebuild.

## Saved quotes page

`rockstar-master/saved-quotes.html` lets a dealer see their own quotes from the last 90 days.

1. In HighLevel, add a page (for example `/saved-quotes`) to the funnel or site that holds the dealer page.
2. Add a "Custom HTML/JS" element and paste the whole file in. Set `quoteStoreUrl` in its CONFIG to the same
   address as the dealer page.
3. In the page's SEO settings, turn off search engine indexing, and keep the page out of the site menu.
4. Give each dealer the page link and their access code. Sign in on the page with the admin code, type the dealer
   name under "Access code for dealer name" and press "Show code". The name must match the dealer name on their
   quotes.

Reading routes, all with the code in the `x-access-code` header:

| Route | Code | Returns |
|---|---|---|
| `GET /quotes?dealer=<name>` | dealer or admin | that dealer's quotes, newest first |
| `GET /quotes/<quote_name>?dealer=<name>` | dealer or admin | one full quote, including `offer_url` |
| `GET /dealers` | admin | every dealer folder |
| `GET /access-code?dealer=<name>` | admin | that dealer's access code |

## Finding a quote

Cloudflare dashboard, R2, `rockstar-deal-desk-quotes`, then the dealer's folder. Files are deleted 90 days after
they were last saved, by the bucket's lifecycle rule.

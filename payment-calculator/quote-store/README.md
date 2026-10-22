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
npx wrangler@4 deploy
openssl rand -hex 24 | npx wrangler@4 secret put QUOTE_ADMIN_SECRET
```

`ALLOWED_ORIGINS` in `wrangler.jsonc` lists every dealer subdomain. Add a new dealer's subdomain there and deploy again.

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

## Forgot your code emails

The dealer page has a "Forgot your saved quotes code?" link at the bottom. The dealer types an email address,
and the Worker posts that dealer's access code to a HighLevel inbound webhook, whose workflow emails it.

1. In HighLevel, create a workflow with an Inbound Webhook trigger and a Send Email action to
   `{{inboundWebhookRequest.email}}`. Paste `emails/4-access-code.html` into the email.
2. Store the webhook URL as a Worker secret and deploy:

```bash
echo '<webhook url>' | npx wrangler@4 secret put CODE_EMAIL_WEBHOOK
```

`POST /access-code/email` takes the form fields `dealer`, `email` and `saved_quotes_path` from an allowed origin and
sends `event` (`access_code_requested`), `dealer`, `dealer_slug`, `email`, `access_code`, `saved_quotes_url` and
`requested_at` to the webhook. It answers 202 when sent, 429 when that dealer's code was emailed in the last
5 minutes, and 503 until `CODE_EMAIL_WEBHOOK` is set. The last send time per dealer is kept in R2 under `_service/`.

## Finding a quote

Cloudflare dashboard, R2, `rockstar-deal-desk-quotes`, then the dealer's folder. Files are deleted 90 days after
they were last saved, by the bucket's lifecycle rule.

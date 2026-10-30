# Rockstar Deal Desk changelog

Formerly the RockstarAI Engagement Calculator. `build.py` reads the version from the first `## v` heading below.
To ship a change: add a heading for the new version, describe what changed, then run `python3 build.py`
(`--master-only` leaves the client builds alone).

## v3.13
- **Automatic sales tax.** The dealer page works out the sales tax from the customer's state and ZIP code, so an out-of-state buyer is taxed by their own state. It applies each state's vehicle rules (trade-in credit and caps, doc fee and rebate treatment, local tax caps such as Tennessee's $1,600 and Florida's $5,000, max tax caps such as South Carolina's $500) on top of the ZIP local rate, and shows the math under the tax field. "Enter tax by hand" turns it off (remembered on the device); "Calculate tax from customer ZIP" turns it back on.
- New pricing fields: **Of those fees, the dealer doc fee** (used only for tax) and **Vehicle is New / Used** (Ohio gives trade-in credit on new vehicles only).
- Tax data loads from `https://assets.rockstarinfo.com/deal-desk/tax/`, built by `build_tax.py` from `tax/state-rules.json` and the ZIP rate tables in `tax-rates/`. The state rules are a first draft and every state is unverified until checked against a real deal.

## v3.12
- **Live updates.** Each calculator now has short loader snippets in `<slug>/ghl/` (dealer page, quote page, saved quotes page). The calculator code and each dealer's settings load from `https://assets.rockstarinfo.com/deal-desk/`, so after a one-time re-paste of the loaders, every future change goes live in HighLevel within about 5 minutes with no re-paste.
- `build.py` now also runs `build_hosted.py`, which writes `hosted/deal-desk/deal-desk.js`, `saved-quotes.js` and `clients/<slug>.json`. Copy `hosted/deal-desk/` to `site-assets/deal-desk/` on the `site-assets` branch to publish.
- The full single-file pages are still built, for dealers who paste the calculator on their own website.

## v3.11
- **Forgot your saved quotes code?** at the bottom of the dealer page, while quote saving is on. The dealer types an email address and taps "Email my code". The quote store sends the dealer's access code to the HighLevel webhook in its `CODE_EMAIL_WEBHOOK` secret, and that workflow emails it. One code email per dealer every 5 minutes.
- The webhook fields are `event` (`access_code_requested`), `dealer`, `dealer_slug`, `email` (the address the dealer typed), `access_code`, `saved_quotes_url` and `requested_at`. The email template is `emails/4-access-code.html`.
- The saved quotes sign in points to the new link.

## v3.10
- One set of trade amounts in the webhook: `trade_allowance_amount` and `trade_amount_owed` (plain numbers). The money-formatted `trade_allowance` and `trade_balance_owed` are no longer sent.
- The "Quote locked in" notification email (`emails/1-quote-locked-in.html`) now reads the trade lines from `trade_allowance_amount` and `trade_amount_owed`. Paste the updated email into HighLevel when the new pages go live, or its trade lines come through blank.

## v3.9
- Every webhook alert carries `vehicle_price`, the purchase price as a plain number (for example `40000.00`), ready for a HighLevel custom field. It is the price before tax and fees.

## v3.8
- Every webhook alert carries two new trade fields as plain numbers, ready for HighLevel custom fields: `trade_allowance_amount` (what the trade is worth, for example `10000.00`) and `trade_amount_owed` (what the customer still owes on it, for example `2000.00`). Both are `0.00` when there is no trade. The money-formatted `trade_allowance` and `trade_balance_owed` fields are unchanged, so the emails keep working (both removed in v3.10).

## v3.7
- Redemption Auto Sales moves to its own HighLevel sub account, so its dealer and customer pages now send webhooks to the new sub account's inbound webhook. The other calculators keep their webhooks.

## v3.6
- Kelly Ford, Redemption Auto Sales and Wildcat Used Cars move from v2.9 to Rockstar Deal Desk, with everything from v3.0 to v3.5: the customer, vehicle and trade fields, required customer name, the new webhook fields, Print this offer (Multi-Payment grid only), and quote saving to the quote store. Each now also has its own saved quotes page.

## v3.5
- **Print this offer** on the dealer page only shows with the Multi-Payment grid layout. With Adjustable, the salesperson works the payment with the customer or sends the link, so there is nothing to print. The button appears and disappears as the layout is switched.

## v3.4
- **Print this offer** on the dealer page, with the Multi-Payment grid, now prints a worksheet: every grid payment with none picked, "Circle the payment that works best for you", and blank lines for the down payment, term and monthly payment the customer chooses. Page 1 shows the price lines without the picked down payment, amount financed, term or payment.
- Every printed offer with a payment grid starts the payment options on page 2, so the grid is never split. Page 1 holds the customer, vehicle and pricing.

## v3.3
- The dealer page has a "Saved quotes" button in its top bar while quote saving is on. It opens `CONFIG.savedQuotesPath` (default `/saved-quotes`) on the same site. Customers never see it.

## v3.2
- New **saved quotes page** (`rockstar-master/saved-quotes.html`). A dealer signs in once with their access code and sees their quotes from the last 90 days, newest first, with customer, vehicle, payment, status and salesperson. Search by name, phone, vehicle, stock or salesperson, and "Open quote" reopens the offer. The device remembers the sign in until "Sign out".
- Each dealer only sees their own folder. A dealer's access code is worked out from the quote store's admin code and the dealer name, so there is no list of codes to keep. Signed in with the admin code, the page can switch between dealers and show any dealer's access code.
- The quote store answers `GET /quotes`, `GET /quotes/<quote_name>`, `GET /dealers` and `GET /access-code` for the saved quotes page. It now saves a short summary with each quote so a dealer's list loads in one step.
- The quote store is live at `https://rockstar-deal-desk-quotes.rockstar-designs-llc.workers.dev/quotes`. The Rockstar master dealer page and saved quotes page have it in `quoteStoreUrl`, so master quotes are saved from now on. The client builds turn it on when they are rebuilt.
- Fill in `quoteStoreUrl` on a saved quotes page with the same address as its dealer page.

## v3.1
- Quote storage: with `quoteStoreUrl` set in CONFIG, every `quote_created`, `quote_printed`, `quote_requested` and `lease_requested` alert is also saved to Cloudflare R2 as `<dealer>/<quote_name>.json` (for example `kelly-ford/10-16-2026-Jane-Doe-A1234-Ford-F150.json`). A later save of the same quote name keeps the newest version. R2 deletes each file 90 days after it was last saved. The Worker is in `quote-store/`.
- With storage on, the dealer page footer reads "All quotes will be deleted after 90 days."
- Storage stays off until the quote store is deployed and its URL is added to CONFIG.

## v3.0
- Rockstar master only for now. The client builds stay on v2.9 until they are rebuilt.
- Renamed to **Rockstar Deal Desk**.
- **Customer** section: first name and last name (both required before a link is copied or the offer is printed), email, phone, street address, city, state and ZIP.
- **Vehicle** section: stock number, VIN, year, make, model, trim and odometer. "Model and trim" is now two fields, and "Mileage" is now "Odometer".
- **Trade** section adds trade year, make, model, trim, VIN and odometer.
- The customer page has a "Your deal details" card with the customer, vehicle and trade details, and the PDF lists them too.
- **Lease**: the customer taps a lease term to choose it, then taps "Lock in this lease". One "Text this lease to my salesperson" button texts the chosen lease.
- **Print this offer** on the dealer page prints the offer with a "Lock in Your Deal" box (customer printed name, signature and date) and a preliminary quote disclaimer. Saving the PDF from a desking link prints the same box.
- New webhook events from the dealer page: `quote_created` when the customer link or the desking link is copied, and `quote_printed` when the offer is printed. Each one goes out once per quote version, and `quote_source` says which button sent it (`customer_link`, `desk_link` or `print`).
- Every webhook alert now carries the fields below. The old fields are unchanged, so the notification emails keep working. Links made before v3.0 still open, and their full name is split into first and last.

### Webhook fields for HighLevel custom fields
| Field | What it holds |
|---|---|
| `event` | `quote_created`, `quote_printed`, `quote_opened`, `quote_requested` (purchase locked in), `lease_requested` (lease locked in), `text_clicked` |
| `quote_source` | `customer_link`, `desk_link` or `print` (only on `quote_created` and `quote_printed`) |
| `quote_id` | The quote ID, for example `Q1A2B3C4` |
| `quote_name` | `MM-DD-YYYY-FirstName-LastName-StockNumber-Make-Model`, for example `10-16-2026-Jane-Doe-A1234-Ford-F150` |
| `quote_date` | The date the quote was created, `YYYY-MM-DD` |
| `customer_first_name`, `customer_last_name` | Customer name |
| `customer_name` | First and last name together |
| `customer_email`, `customer_phone` | Customer contact |
| `customer_street`, `customer_city`, `customer_state`, `customer_zip` | Customer address |
| `vehicle_stock`, `vehicle_year`, `vehicle_make`, `vehicle_model`, `vehicle_trim`, `vehicle_vin`, `vehicle_odometer` | The vehicle being quoted |
| `vehicle_price` | Purchase price before tax and fees as a plain number, for example `40000.00` (added in v3.9) |
| `trade_year`, `trade_make`, `trade_model`, `trade_trim`, `trade_vin`, `trade_odometer` | The trade-in vehicle |
| `trade_allowance_amount`, `trade_amount_owed` | Trade allowance and amount owed as plain numbers, for example `10000.00` (added in v3.8) |
| `deal_type` | `purchase`, or `lease` on `lease_requested` and on a lease `text_clicked` |
| `deal_rate` | APR as a plain number, for example `7.49`. It is sent even when the rate is hidden from the customer, and is blank for a lease |
| `deal_term` | Term in months, for example `60` |
| `deal_down_payment` | Down payment as a plain number, for example `2000.00` |
| `deal_monthly_payment` | Monthly payment as a plain number, for example `389.42`. It is the payment the customer chose: the slider, the grid cell they tapped or the lease they locked in |

These fields are unchanged and stay formatted for emails: `vehicle`, `stock`, `salesperson`, `salesperson_cell`, `dealer`, `dealer_email`,
`monthly_payment`, `down_payment`, `amount_financed`, `term_months`, `apr` (`hidden` when hidden), `credit_score`,
`rebate`, `rebate_line`, `lease_quote`, `payment_layout`, `payment_grid`, `payment_grid_line`, `offer_url`,
`timestamp`, `link_modified`, and on lease events `lease_term`, `lease_payment`, `lease_down`, `lease_miles`, `lease_line`.
`offer_url` is always the customer link, including on the dealer page events.

## v2.9
- New "Payment layout" choice on the dealer page: **Adjustable** (the sliders, as before) or **Multi-Payment grid**. Works on standard and subprime.
- Multi-Payment grid: the dealer sets one fixed rate (shown or hidden), 3 terms and 3 down payments. The customer page shows all 9 monthly payments in a grid. The customer taps one to choose it, and that payment drives the breakdown, "Lock in this payment", the text and the PDF.
- In grid mode the credit score slider is not offered, and lease still works below the grid.
- The layout, grid terms and grid down payments are saved on the dealer's device.
- Webhook alerts carry `payment_layout` (`adjustable` or `grid`) and `payment_grid`, which lists all 9 payments. It is blank in adjustable mode. `payment_grid_line` is the same list, ready to drop into an email. The three notification emails now show it. Customer emails and the PDF list every grid payment too.
- New optional CONFIG keys for client builds set the starting values: `paymentLayout`, `gridTerms`, `gridDownPayments`, `fixedRate`, `rateDisplay`.

## v2.8
- New client build: Wildcat Used Cars (subprime).

## v2.7
- New subprime calculator type (`calculatorType: 'subprime'` in CONFIG). It removes the lease option and the credit score slider from both pages, offers Fixed or Hidden rate with Hidden as the default, and adds "All payments are subject to lender approval." to the disclaimer.
- New optional `headerColor` in CONFIG sets the customer page header bar color. Text turns light on dark colors, so logos with a dark background blend in.
- A logo set in the code now shows as an image on the dealer page instead of its URL.
- New client build: Redemption Auto Sales (subprime).

## v2.6
- The five credit tier rate boxes line up, even when a tier label wraps to two lines.
- "Dealer notification email" is now "Salesperson notification email" and sits in the Salesperson section. It is still saved on the device, and alerts and customer emails still go to it.

## v2.5
- Text buttons appear only on phones and tablets.
- The purchase button reads "Text this deal to my salesperson".
- Each lease term has a "Text this lease to my salesperson" button. Tapping it sends a `text_clicked` alert that carries the lease.
- The box shown after "I want this lease" offers only Copy my offer and Email.
- The dealer workspace header shows the version number.

## v2.4
- The dealer sidebar shows the down payment, so the numbers add up from top to bottom.
- Trade equity is shown with a sign, and the trade row is hidden when there is no trade.

## v2.3
- Every webhook alert carries `lease_quote`, which describes the lease on offer. It is blank when no lease is presented.

## v2.2
- Lease option, with a "Present Lease" checkbox, two terms, a lease down payment slider, and "I want this lease" (`lease_requested`).
- Purchase and lease down payments can be typed into a box as well as set with the slider.

## v2.1
- Rebate field.
- "Copy desking link" button.
- Dealer logo 50% larger.
- Profile fields also save on `change`.
- Hardcoded GHL webhook.
- A message replaces the blank page when pasted code is incomplete or fails to load.

## v2.0
- Live HighLevel code as imported.

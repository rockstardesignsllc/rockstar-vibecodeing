# RockstarAI Engagement Calculator changelog

`build.py` reads the version from the first `## v` heading below. To ship a change: add a
heading for the new version, describe what changed, then run `python3 build.py`.

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

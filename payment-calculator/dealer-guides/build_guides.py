#!/usr/bin/env python3
"""Build the dealer instruction guides (PDF) for the Rockstar payment calculators.

Makes one guide per calculator type: standard, subprime, powersports.
Master copies use placeholders for the dealer name, logo and web address.

  python3 build_guides.py                      # all three master guides
  python3 build_guides.py --kind standard --dealer "Kelly Ford" \
      --logo /path/logo.png --site kellyford.rockstarcrm.app --out kelly-ford-guide.pdf

Needs Node with Playwright (for the HTML to PDF step) and the screenshots in img/.
"""
import argparse, base64, datetime, html, json, mimetypes, pathlib, subprocess

HERE = pathlib.Path(__file__).resolve().parent
IMG = HERE / 'img'
GUIDE_VERSION = '1.0'

KINDS = {
    'standard': dict(code='std', title='Payment Calculator', short='Standard', tool='Rockstar Deal Desk'),
    'subprime': dict(code='sub', title='Sub-Prime Payment Calculator', short='Sub-Prime', tool='Rockstar Deal Desk'),
    'powersports': dict(code='ps', title='Powersports Deal Desk', short='Powersports', tool='Rockstar Powersports Deal Desk'),
}


def data_uri(path):
    p = pathlib.Path(path)
    mime = mimetypes.guess_type(p.name)[0] or 'image/png'
    return f'data:{mime};base64,' + base64.b64encode(p.read_bytes()).decode()


def build_html(kind, dealer, logo, site, stamp):
    k = KINDS[kind]
    c = k['code']
    STD, SUB, PS = kind == 'standard', kind == 'subprime', kind == 'powersports'
    e = html.escape
    D = e(dealer)
    S = e(site)
    vehicle_word = 'unit' if PS else 'vehicle'

    def img(name, caption='', width=None, cls=''):
        f = IMG / f'{c}-{name}.jpg'
        if not f.exists():
            raise SystemExit(f'missing screenshot {f.name}')
        style = f' style="max-width:{width}"' if width else ''
        cap = f'<figcaption>{caption}</figcaption>' if caption else ''
        return f'<figure class="{cls}"><img src="{data_uri(f)}"{style} alt="">{cap}</figure>'

    def tip(text, label='Tip'):
        return f'<div class="callout tip"><b>{label}</b><p>{text}</p></div>'

    def warn(text, label='Important'):
        return f'<div class="callout warn"><b>{label}</b><p>{text}</p></div>'

    def steps(*items):
        return '<ol class="steps">' + ''.join(f'<li>{i}</li>' for i in items) + '</ol>'

    logo_html = (f'<img class="dealer-logo" src="{data_uri(logo)}" alt="">' if logo
                 else '<div class="logo-slot">DEALER LOGO HERE</div>')
    rockstar_logo = data_uri(IMG / 'logo.png')
    rockstar_white = data_uri(IMG / 'logo_white.png')
    brand_logo = (f'<img class="brand-wordmark" src="{data_uri(IMG / "aiforpowersports-logo.png")}" alt="AiForPowersports">' if PS
                  else f'<div class="brand-mark"><img src="{rockstar_logo}" alt=""><span>RockstarAI</span></div>')
    terms_txt = '24 to 144 months (24, 36, 48, 60, 72, 84, 96, 108, 120, 132 and 144)' if PS else '24 to 84 months (24, 36, 48, 60, 72 and 84)'
    odo = 'Odometer, with a <b>Miles</b> or <b>Hours</b> choice next to it' if PS else 'Odometer (miles)'

    P = []  # pages

    # ---------- cover ----------
    P.append(f'''
<section class="cover">
  <div class="cover-top">{brand_logo}<span class="cover-ver">Guide v{GUIDE_VERSION}</span></div>
  <div class="cover-dealer">{logo_html}<div class="dealer-name">{D}</div></div>
  <div class="cover-title">
    <div class="kicker">Dealer training guide</div>
    <h1>How to use your<br>{e(k["title"])}</h1>
    <p class="lead">Build a payment quote, send it to your customer, and close the deal. Step by step, in plain English.</p>
  </div>
  <div class="cover-box">
    <div><small>Your dealer page</small><b>https://{S}/home</b></div>
    <div><small>Your saved quotes</small><b>https://{S}/saved-quotes</b></div>
  </div>
  <div class="cover-foot">Powered by RockstarAI &middot; {e(k["tool"])} &middot; Updated {stamp} UTC</div>
</section>''')

    # ---------- contents + quick start ----------
    toc = ['Quick start: your first quote in 5 minutes', 'The three pages you will use', 'One-time setup',
           'Build a quote, section by section', 'Choose how payments look', 'Set the interest rate', 'Set the terms']
    if STD: toc.append('Show a lease')
    toc += ['Send the quote', 'What your customer sees', 'When a customer says yes', 'Work a deal at the desk',
            'Find old quotes (Saved quotes)', 'Mistakes to avoid', 'FAQ', 'Glossary']
    P.append(f'''
<section>
  <div class="kicker">Start here</div>
  <h2>Quick start: your first quote in 5 minutes</h2>
  <p class="lead">Do these steps in order. Each one is explained in detail later in this guide.</p>
  {steps(
      f'Open your dealer page: <b>https://{S}/home</b>. Bookmark it.',
      'Type <b>your name, your cell number and your email</b> in the Salesperson section. You only do this once per computer or phone.',
      'Type the <b>customer\'s first and last name</b>. Both are required. Add their phone, email, address, state and ZIP code.',
      f'Type the <b>{vehicle_word}</b>: stock number, year, make, model and trim.',
      'Type the <b>purchase price</b>, the fees, and the down payment. Sales tax fills in by itself from the customer\'s state and ZIP.' if not PS else
      'Type the <b>purchase price</b>, fees, <b>freight</b> and <b>setup and prep</b>, and the down payment. Sales tax fills in by itself from the customer\'s state and ZIP. Check the <b>factory offers</b> box for rebates.',
      'If they have a trade, type what it is worth and what they still owe on it.',
      'Look at the black box on the right. That is the payment. Check it makes sense.',
      'Press <b>Copy customer link</b>. Paste it in a text or email to the customer. Done.'
  )}
  {tip('Want to sit with the customer instead? Press <b>Copy desking link</b> and open it on your screen. See "Work a deal at the desk".')}
  <h3>What is in this guide</h3>
  <ol class="toc">{''.join(f'<li>{t}</li>' for t in toc)}</ol>
</section>''')

    # ---------- three pages ----------
    P.append(f'''
<section>
  <div class="kicker">The basics</div>
  <h2>The three pages you will use</h2>
  <table class="pages">
    <tr><th>Page</th><th>Address</th><th>Who uses it</th><th>What it is for</th></tr>
    <tr><td><b>Dealer page</b></td><td>https://{S}/home</td><td>You and your team</td><td>Build the quote and send the link. Customers never see this page.</td></tr>
    <tr><td><b>Customer quote page</b></td><td>https://{S}/quote</td><td>Your customer</td><td>Opens from the link you send. The customer sees their offer, plays with the payment, and locks it in.</td></tr>
    <tr><td><b>Saved quotes</b></td><td>https://{S}/saved-quotes</td><td>You and your team</td><td>Every quote from the last 90 days. Search it and reopen any quote.</td></tr>
  </table>
  <p>The top of your dealer page looks like this. The <b>Saved quotes</b> button in the top right corner takes you to your saved quotes.</p>
  {img('d00-top', 'Top of the dealer page')}
  {tip('Updates are automatic. When Rockstar improves the calculator, your pages update by themselves. You never need to reinstall anything.', 'Good to know')}
</section>''')

    # ---------- setup ----------
    P.append(f'''
<section>
  <div class="kicker">Do this once</div>
  <h2>One-time setup</h2>
  <h3>Dealership</h3>
  <p>Your dealership name, logo and colors are already set up by Rockstar. They show as "(set in code settings)" and you cannot change them here. If something is wrong, contact Rockstar support.</p>
  {img('d01-dealership', 'Dealership section: already filled in for you', '78%')}
  <h3>Salesperson</h3>
  {steps(
      '<b>Salesperson name</b>: your name. The customer sees it on their quote.',
      '<b>Salesperson cell</b>: your cell number. This adds a <b>Text</b> button to the customer\'s quote so they can text you in one tap.',
      '<b>Salesperson notification email</b>: where your quote alerts and "I want this deal" emails go. Use an email you check.'
  )}
  {img('d02-salesperson', 'Salesperson section', '78%')}
  {tip('These fields are saved on <b>this computer or phone</b> as you type. You will not need to type them again on this device. Using a different device? Type them once there too.')}
  {warn('Sharing a computer with another salesperson? Click <b>Forget saved info</b> at the top of the Dealership section, then type your own details. Otherwise your customers will get the other person\'s name and number.', 'Shared computer')}
</section>''')

    # ---------- build quote: customer + vehicle ----------
    P.append(f'''
<section>
  <div class="kicker">Build a quote</div>
  <h2>Build a quote, section by section</h2>
  <p class="lead">Work from top to bottom. The payment on the right updates as you type.</p>
  <h3>Step 1. Customer</h3>
  {steps(
      'Type the <b>First name</b> and <b>Last name</b>. These are <b>required</b>. Without them the link will not copy and the quote cannot be found later.',
      'Type the <b>Email</b> and <b>Phone</b>.',
      'Type the <b>Street address</b>, <b>City</b>, <b>State</b> and <b>ZIP code</b>. Use the 2-letter state, like TN.'
  )}
  {img('d03-customer', 'Customer section', '82%')}
  {warn('The <b>State and ZIP code</b> are what the sales tax is worked out from. Use the <b>customer\'s</b> home address, not the dealership\'s. An out-of-state buyer gets their own state\'s tax.', 'Why state and ZIP matter')}
</section>''')

    P.append(f'''
<section>
  <h3>Step 2. {"Unit" if PS else "Vehicle"}</h3>
  <p>Type the stock number, VIN (17 characters), year, make, model and trim, and the {odo}.</p>
  {img('d04-vehicle', f'{"Unit" if PS else "Vehicle"} section', '82%')}
  {tip('On powersports units, pick <b>Hours</b> for side-by-sides, ATVs or boats that track engine hours. The quote then shows "hours" instead of "miles". The trade-in has its own Miles or Hours choice too.', 'Miles or hours') if PS else ''}
  {tip('Type the <b>make, year and model</b> carefully. The factory offers box uses them to find rebates and special rates for this exact unit.', 'Factory offers') if PS else ''}
</section>''')

    # ---------- pricing ----------
    fees_list = [
        '<b>Purchase price</b>: the selling price. Whole dollars only, no commas or $ sign.',
        '<b>Total sales tax in dollars</b>: fills in by itself (see the next page). Only type here if you switched to "Enter tax by hand".',
        '<b>Title, registration and dealer fees in dollars</b>: all of those fees added together, in dollars.',
        '<b>Of those fees, the dealer doc fee</b>: how much of the fees above is your doc fee. It is used only to work out the tax, because some states tax the doc fee.',
    ]
    if PS:
        fees_list += ['<b>Freight in dollars</b>: the freight charge.', '<b>Setup and prep in dollars</b>: the setup and prep charge.']
    fees_list += [
        f'<b>Vehicle is</b>: choose <b>New</b> or <b>Used</b>. Some states treat trade-ins differently on new {vehicle_word}s.',
        '<b>Starting down payment</b>: the down payment the quote opens with. The customer can change it.',
        '<b>Rebate</b>: any rebate in dollars. Leave it blank if there is none.' + (' You can also fill it from the factory offers box.' if PS else ''),
    ]
    P.append(f'''
<section>
  <h3>Step 3. Pricing</h3>
  <p>Enter whole dollar amounts. Do not type "$" or commas.</p>
  {steps(*fees_list)}
  {img('d05-pricing', 'Pricing section', '86%')}
</section>''')

    P.append(f'''
<section>
  <h3>Automatic sales tax</h3>
  <p>The sales tax works itself out from the customer's <b>state and ZIP code</b>. It uses that state's vehicle tax rules, local tax rates, trade-in credit, and doc fee rules. The gray box under the tax field shows the math, so you can check it.</p>
  {img('d05b-taxbox', 'The tax box shows how the tax was worked out', '62%')}
  {steps(
      'Fill in the customer\'s <b>State</b> and <b>ZIP code</b> first.',
      'Fill in the price, fees, doc fee, ' + ('freight, setup, ' if PS else '') + 'New or Used, and the trade.',
      'Read the tax box. The top line is the tax amount. The lines below show how it was worked out.',
      'Confirm the tax before you sign any contract. It is an estimate.'
  )}
  <h3>Typing the tax yourself</h3>
  <p>Click <b>Enter tax by hand</b> to turn the automatic tax off and type the total tax in dollars. Click <b>Calculate tax from customer ZIP</b> to turn it back on. Your choice is remembered on this device.</p>
  {img('d05c-taxmanual', 'Automatic tax turned off', '62%')}
  {warn('Type the tax in <b>dollars</b>, not a percentage. If you type 7 for 7%, the page warns you: "That looks like a percentage."', 'Dollars, not percent')}
  {warn('If you see "Tax rates could not load", refresh the page. If it keeps happening, use Enter tax by hand and tell Rockstar support.', 'If the tax does not load')}
</section>''')

    if PS:
        P.append(f'''
<section>
  <h3>Factory offers (rebates and special rates)</h3>
  <p>Under Pricing, a box lists the current factory rebates and promotional rates for the unit's <b>make, year and model</b>. Rockstar checks the manufacturers' public offer pages every week, so you do not have to hunt for them.</p>
  {img('d05d-offers', 'Factory offers box (top of the list)')}
  {steps(
      'Make sure the <b>Make</b>, <b>Year</b> and <b>Model</b> are filled in. Offers that name your model are listed first. Offers for every model come next. Others are under "other offers".',
      'Read the offer, who qualifies, and the end date. Click <b>Fine print</b> for the details and a link to the source.',
      'For a cash rebate, click <b>Add to rebate</b>. The amount goes into the Rebate field. Click more than one to stack them. Click <b>Remove from rebate</b> to take one off.',
      'For a special rate, click <b>Use this rate</b>. The quote switches to a fixed rate at that APR and term.'
  )}
  {img('d05e-offerpicked', 'An offer added to the rebate', '80%')}
  {warn('Typing in the Rebate field yourself clears the offers you clicked. Always confirm the program, dates and that the customer qualifies before you contract. Many offers cannot be combined.', 'Check before you promise')}
  {tip('Brands covered: Polaris, Can-Am, Honda, Kawasaki, Yamaha, Indian Motorcycle and Harley-Davidson. If a brand shows "No current offers on file", there are none on file this week. Use the manufacturer\'s dealer portal.', 'Brands')}
</section>''')

    P.append(f'''
<section>
  <h3>Step {4}. Trade</h3>
  <p>No trade? Leave the amounts at 0 and the {vehicle_word} fields blank.</p>
  {steps(
      '<b>Trade allowance</b>: what you are giving the customer for their trade.',
      '<b>Trade balance owed</b>: what the customer still owes on it (their payoff).',
      'Read the colored line under the amounts. Green means positive equity, which lowers the amount financed. If they owe more than it is worth, it shows <b>negative equity</b>, which is added to the amount financed.',
      'Fill in the trade year, make, model, trim, VIN and odometer' + (' (Miles or Hours)' if PS else '') + '.'
  )}
  {img('d06-trade', 'Trade section', '82%')}
</section>''')

    # ---------- layout ----------
    P.append(f'''
<section>
  <div class="kicker">Payments</div>
  <h2>Choose how payments look</h2>
  <p>Pick one of two layouts. Click the box to choose it. The red outline shows which one is on.</p>
  {img('d07-layout', 'Payment layout choice', '82%')}
  <table class="compare">
    <tr><th></th><th>Adjustable</th><th>Multi-Payment grid</th></tr>
    <tr><td>What the customer sees</td><td>Sliders for the payment, down payment and term.</td><td>A table of 9 payments: 3 terms across, 3 down payments down.</td></tr>
    <tr><td>Best for</td><td>Customers who want to play with the numbers.</td><td>Quick "pick one" choices. Great for printing.</td></tr>
    <tr><td>Rate</td><td>{"Fixed or hidden" if SUB else "Credit score slider, fixed or hidden"}</td><td>One fixed rate, shown or hidden</td></tr>
    <tr><td>Print this offer</td><td>Not available</td><td>Available</td></tr>
  </table>
  <h3>Setting up the grid</h3>
  {steps(
      'Click <b>Multi-Payment grid</b>.',
      'In <b>Interest rate</b>, choose <b>Fixed rate</b> (shown) or <b>Hidden rate</b>, and type the APR.',
      'In <b>Payment grid</b>, pick <b>Term 1, Term 2 and Term 3</b>.',
      'Type <b>Down payment 1, 2 and 3</b>.',
      'Check the grid on the right. The highlighted payment is the one the customer starts on.'
  )}
  {img('d12b-grid-terms', 'Payment grid settings', '82%')}
  {tip('If a down payment is bigger than the amount being financed, the page caps it and tells you. Lower that down payment.')}
  {tip('Your layout, grid terms and grid down payments are remembered on this device.')}
</section>''')

    # ---------- rate ----------
    if SUB:
        rate_body = f'''
  <p>Sub-prime quotes have two choices. <b>Hidden rate</b> is on by default.</p>
  {img('d08-rate', 'Interest rate: Hidden rate (default)', '82%')}
  <table class="compare">
    <tr><th>Choice</th><th>What the customer sees</th><th>When to use it</th></tr>
    <tr><td><b>Hidden rate</b></td><td>The payment only. No rate is shown anywhere on the quote.</td><td>Most sub-prime deals. The rate is used to work out the payment but stays private.</td></tr>
    <tr><td><b>Fixed rate</b></td><td>The rate, which they cannot change.</td><td>When you have an approval and want to show the rate.</td></tr>
  </table>
  {steps('Click <b>Hidden rate</b> or <b>Fixed rate</b>.', 'Type the APR, for example 18.99. It is the rate used for the payment.')}
  {img('d08b-rate-fixed', 'Fixed rate', '82%')}
  {warn('Every sub-prime quote says: "All payments are subject to lender approval." There is no credit score slider and no lease on sub-prime quotes.', 'Built in for sub-prime')}'''
    else:
        rate_body = f'''
  <p>Pick how the rate works. Click the box to choose it.</p>
  <table class="compare">
    <tr><th>Choice</th><th>What the customer sees</th><th>When to use it</th></tr>
    <tr><td><b>Credit score slider</b></td><td>A slider for their credit score. The rate changes with the score.</td><td>Before you have pulled credit. Lets the customer see how credit affects the payment.</td></tr>
    <tr><td><b>Fixed rate</b></td><td>The rate, which they cannot change.</td><td>You know the rate, for example a lender approval or a factory special.</td></tr>
    <tr><td><b>Hidden rate</b></td><td>The payment only. No rate shown.</td><td>You do not want to show the rate.</td></tr>
  </table>
  <h3>Credit score slider</h3>
  {steps(
      'Click <b>Credit score slider</b>.',
      'Type the APR for each of the 5 credit tiers: 781+ (Excellent), 721 to 780 (Very good), 661 to 720 (Good), 601 to 660 (Fair), and 600 and below (Rebuilding).',
      'Type the <b>Starting credit score</b>, the score the quote opens on. 720 is the default.'
  )}
  {img('d08-rate', 'Credit score slider with the 5 tier rates', '82%')}
  {tip('Your tier rates are saved on this device, so you set them once.')}
  <h3>Fixed or hidden rate</h3>
  {steps('Click <b>Fixed rate</b> or <b>Hidden rate</b>.', 'Type the APR. With Hidden rate, the rate is used for the payment but never shown.')}
  {img('d08c-rate-hidden', 'Hidden rate', '82%')}'''
    P.append(f'''
<section>
  <h2>Set the interest rate</h2>
  {rate_body}
</section>''')

    # ---------- terms ----------
    P.append(f'''
<section>
  <h2>Set the terms</h2>
  <p>With the Adjustable layout, you choose which terms the customer can pick from. Terms run {terms_txt}.</p>
  {steps(
      'Check the box on every term the customer may choose. Uncheck the ones you do not want to offer.',
      'Want to <b>lock the term</b>? Check only <b>one</b> box. The customer then sees "Term set by ' + D + '" and cannot change it.',
      'Pick the <b>Starting term</b>, the term the quote opens on.'
  )}
  {img('d09-term', 'Finance term choices', '86%')}
  {tip('Long terms (96 to 144 months) are common on big-ticket units like boats and RVs. Only offer terms your lenders will actually approve.', 'Powersports terms') if PS else ''}
</section>''')

    # ---------- lease ----------
    if STD:
        P.append(f'''
<section>
  <h2>Show a lease</h2>
  <p>You can show a lease option under the purchase payment. The lease and the purchase never change each other.</p>
  {warn('The calculator does <b>not</b> work out the lease payment. You type in the lease payments from your lease worksheet or lender.', 'You supply the lease numbers')}
  {steps(
      'Check <b>Present Lease</b>.',
      'Type the <b>Lease down payment</b> your lease payments are based on.',
      'Type the <b>Annual mileage</b>, for example 12000.',
      'Type <b>Term 1</b> in months and its <b>monthly payment</b>.',
      'Optional: type <b>Term 2</b> and its payment. Leave Term 2 blank to show only one lease.',
  )}
  {img('d11-lease', 'Lease settings', '82%')}
  {tip('If the customer moves the lease down payment slider, each lease payment changes by the difference divided by the number of months. It is a quick estimate, so confirm the final lease with your lender.')}
</section>''')

    # ---------- send ----------
    P.append(f'''
<section>
  <div class="kicker">Send it</div>
  <h2>Send the quote</h2>
  <p>The black box on the right of the dealer page shows the payment and the deal math. Below it are your buttons.</p>
  <div class="two">
    <div>{img('d10-sidebar', 'Payment summary and buttons')}</div>
    <div>
      <table class="buttons">
        <tr><td><b>Copy customer link</b></td><td>Copies the link for the customer. Paste it into a text or email. <b>This is the one you will use most.</b></td></tr>
        <tr><td><b>Copy desking link</b></td><td>Copies a link for you to open at the desk with the customer. See "Work a deal at the desk".</td></tr>
        <tr><td><b>Print this offer</b></td><td>Prints a worksheet with every grid payment for the customer to circle and sign. Only shows with the Multi-Payment grid.</td></tr>
        <tr><td><b>Preview customer view</b></td><td>Opens the customer's page in a new tab so you can check it. It sends no alerts.</td></tr>
      </table>
    </div>
  </div>
  {steps(
      'Check the payment and the numbers in the black box.',
      'Click <b>Preview customer view</b> and look it over.',
      'Click <b>Copy customer link</b>. The button says "Copied".',
      'Open your texting app or email, paste the link, and send it.'
  )}
  {warn('If the button will not copy and you see "Enter the customer\'s first and last name first", fill in both names at the top.', 'Link will not copy?')}
  {tip('Each new version of a deal gets its own <b>quote ID</b> (shown under the buttons). Changed the numbers? Copy and send a new link. The old link still shows the old numbers.')}
</section>''')

    P.append(f'''
<section>
  <h3>Printing the offer (grid layout only)</h3>
  {img('d12c-grid-sidebar', 'With the grid layout, Print this offer appears', '46%')}
  {steps(
      'Choose the <b>Multi-Payment grid</b> layout.',
      'Click <b>Print this offer</b>.',
      'Print it, or choose "Save as PDF" in the print window.',
      'Page 1 has the customer, ' + vehicle_word + ' and pricing. Page 2 has all 9 payments, with "Circle the payment that works best for you", blank lines for the down payment, term and payment they choose, and a signature box.'
  )}
  <h3>What sends an alert</h3>
  <p>Copying a link or printing sends the quote to your dealership's system and saves it to Saved quotes. Preview and desking views never send alerts.</p>
  <table class="compare">
    <tr><th>When this happens</th><th>You get</th></tr>
    <tr><td>You copy a customer or desking link, or print</td><td>The quote is saved ("Link sent" or "Printed offer")</td></tr>
    <tr><td>The customer opens the link</td><td>A "quote opened" alert</td></tr>
    <tr><td>The customer taps Lock in{" (purchase or lease)" if STD else ""}</td><td>A "locked in" alert, and an email from the customer to your notification email</td></tr>
    <tr><td>The customer taps a Text button</td><td>A "text clicked" alert</td></tr>
  </table>
  {tip('Where these alerts land (email, text, your CRM) depends on how your dealership was set up by Rockstar. Ask your manager if you are not getting them.')}
</section>''')

    # ---------- customer view ----------
    P.append(f'''
<section>
  <div class="kicker">Your customer's side</div>
  <h2>What your customer sees</h2>
  <p>The link opens a page with your dealership's logo and colors. It works on phones, tablets and computers.</p>
  <div class="phones">
    {img('c1-hero', 'Top: their name, the ' + vehicle_word + ' and total price', cls='phone')}
    {img('c1-paybox', 'Their payment and the main buttons', cls='phone')}
  </div>
  <h3>What the customer can do</h3>
  <ul class="checks">
    <li><b>Slide the target monthly payment.</b> The down payment changes to match.</li>
    <li><b>Change the down payment</b> with the slider or by typing it.</li>
    <li><b>Tap a term</b> to choose it (if you offered more than one).</li>
    {"<li><b>Slide their credit score</b> to see the rate change (credit score slider only).</li>" if not SUB else ""}
    <li><b>Pick a payment from the grid</b> (grid layout only).</li>
    <li><b>Lock in this payment</b>: tells you they want this deal.</li>
    <li><b>Text this deal to my salesperson</b>: texts you the deal. Shows only on phones and tablets, and only if you entered your cell.</li>
    <li><b>Save this offer as a PDF</b>: saves or prints their offer.</li>
  </ul>
</section>''')

    P.append(f'''
<section>
  <div class="phones">
    {img('c1-controls', 'Adjustable layout: rate, term, down payment and trade', cls='phone')}
    {img('c2-controls', 'Grid layout: tap a payment to choose it', cls='phone')}
  </div>
  <p>Further down, the customer sees their deal details, the full deal breakdown (price, tax, fees, {"freight, setup, " if PS else ""}trade, down payment, amount financed, rate and term), your name and number, and the financing disclosure.</p>
  {warn('If anyone changes the numbers inside a link, the page shows: "Heads up: this offer link was changed after it was sent." Always confirm the numbers before you contract.', 'Edited links are flagged')}
</section>''')

    if STD:
        P.append(f'''
<section>
  <h3>The lease option on the customer's page</h3>
  <div class="phones">{img('c3-lease', 'Lease option: tap a lease, then Lock in this lease', cls='phone')}</div>
  <p>The customer can move the lease down payment, tap the lease term they want, then tap <b>Lock in this lease</b> or <b>Text this lease to my salesperson</b>.</p>
</section>''')

    # ---------- says yes ----------
    P.append(f'''
<section>
  <h2>When a customer says yes</h2>
  <p>When the customer taps <b>Lock in this payment</b>{" or Lock in this lease" if STD else ""}:</p>
  {steps(
      'Their email app opens with a message to your notification email that says which deal they want. They press Send.',
      'You get a "locked in" alert, and the quote shows as <b>Locked in payment</b>' + (' or <b>Locked in lease</b>' if STD else '') + ' in Saved quotes.',
      'If their email app did not open, the page offers <b>Copy my offer</b>, <b>Text</b> you, or <b>Email</b> the dealership.',
  )}
  <div class="phones">{img('c1-fallback', 'If the email app did not open', cls='phone')}</div>
  <h3>What you do next</h3>
  {steps(
      '<b>Call or text the customer right away.</b> Speed wins the deal.',
      'Open the quote from Saved quotes to see exactly what they picked.',
      'Confirm credit, the rate, tax, fees' + (', rebates and factory offers' if PS else ' and rebates') + ' before you write the contract.',
  )}
</section>''')

    # ---------- desk ----------
    P.append(f'''
<section>
  <h2>Work a deal at the desk</h2>
  <p>The desking link opens the customer's page for you to work at the desk with the customer sitting next to you.</p>
  {steps(
      'Build the quote on your dealer page.',
      'Click <b>Copy desking link</b>.',
      'Paste it into your browser\'s address bar and press Enter. Turn the screen toward the customer.',
      'Move the sliders together until the payment works for them.',
      'Click <b>Save this offer as a PDF</b> to print it. The desking printout has a "Lock in Your Deal" box for the customer to print their name, sign and date.'
  )}
  {tip('The desking view hides the Lock in and Text buttons, because you are right there with the customer. Opening it does not send a "quote opened" alert.')}
</section>''')

    # ---------- saved quotes ----------
    P.append(f'''
<section>
  <div class="kicker">Follow up</div>
  <h2>Find old quotes (Saved quotes)</h2>
  <p>Every quote your team sent, printed or got locked in is saved for <b>90 days</b>.</p>
  <h3>Sign in</h3>
  {steps(
      f'Go to <b>https://{S}/saved-quotes</b>, or click <b>Saved quotes</b> at the top of your dealer page.',
      'Type your dealership\'s <b>access code</b> (it looks like XXXX-XXXX-XXXX-XXXX). If asked, also type the dealership name exactly as it shows on your quotes.',
      'Click <b>Show my quotes</b>. This device stays signed in until you click <b>Sign out</b>.'
  )}
  {img('s1-login', 'Saved quotes sign in', '70%')}
  <h3>Use the list</h3>
  {img('s2-list', 'Saved quotes list (sample data)')}
  {steps(
      'Newest quotes are at the top. Each row shows the customer, ' + vehicle_word + ', payment, status, salesperson and date.',
      'Type in the <b>search box</b> to find a quote by name, phone, ' + vehicle_word + ', stock number or salesperson.',
      'Click <b>Open quote</b> to see the full offer and pick the deal back up.',
      'Click <b>Refresh</b> to load new quotes.'
  )}
  <table class="compare">
    <tr><th>Status</th><th>Meaning</th></tr>
    <tr><td><span class="pill hot">Locked in payment</span>{' <span class="pill hot">Locked in lease</span>' if STD else ''}</td><td>The customer said yes. Call them now.</td></tr>
    <tr><td><span class="pill">Link sent</span></td><td>You copied a link. Follow up if they have not locked in.</td></tr>
    <tr><td><span class="pill">Printed offer</span></td><td>You printed the offer.</td></tr>
  </table>
  <h3>Forgot your access code?</h3>
  {steps('Scroll to the bottom of your dealer page.', 'Click <b>Forgot your saved quotes code?</b>', 'Type your email and click <b>Email my code</b>. One code email can be sent every 5 minutes.')}
  {img('d15-forgot', 'Email yourself the access code', '60%')}
  {warn('Quotes are deleted 90 days after they were last saved. Need to keep a deal longer? Save the PDF to the customer\'s file.', '90 days')}
</section>''')

    # ---------- mistakes ----------
    mistakes = [
        ('Using the dealership\'s ZIP code instead of the customer\'s.', 'Tax is based on where the customer lives. Use their home state and ZIP.'),
        ('Typing tax as a percentage.', 'The tax field is in dollars. Leave it on automatic, or type the dollar amount.'),
        ('Typing "$" or commas in amounts.', 'Type numbers only, like 32995.'),
        ('Leaving the customer\'s last name blank.', 'First and last name are both required to copy a link.'),
        ('Changing numbers but sending the old link.', 'Every change makes a new quote. Copy and send the new link.'),
        ('Sending the desking link to a customer.', 'The desking link has no Lock in button. Send the customer link.'),
        ('Wrong name on the quote after sharing a computer.', 'Click Forget saved info, then type your own details.'),
    ]
    if PS:
        mistakes.insert(3, ('Leaving Miles on for an hours-based unit.', 'Switch the odometer unit to Hours.'))
        mistakes.insert(4, ('Promising a factory offer without checking the fine print.', 'Read eligibility, end date and "cannot be combined" before you quote it.'))
    if SUB:
        mistakes.insert(3, ('Showing a rate before you have an approval.', 'Keep Hidden rate on until you have a lender approval.'))
    P.append(f'''
<section>
  <h2>Mistakes to avoid</h2>
  <table class="compare">
    <tr><th>Mistake</th><th>Do this instead</th></tr>
    {''.join(f'<tr><td>{a}</td><td>{b}</td></tr>' for a, b in mistakes)}
  </table>
</section>''')

    # ---------- FAQ ----------
    faq = [
        ('Do I need to install anything?', 'No. It all runs in your web browser on any computer, phone or tablet.'),
        ('Why did my name and number disappear?', 'Your details are saved on each device. On a new device, or after clearing your browser, type them once more.'),
        ('Is the sales tax exact?', 'It is an estimate from the customer\'s state rules and ZIP code tax tables. Always confirm the tax before you contract.'),
        ('The customer lives in another state. What tax do I use?', 'Type their home state and ZIP. The calculator uses their state\'s rules.'),
        ('Can the customer change the price?', 'No. They can only change the payment, down payment, term' + ('' if SUB else ' and credit score') + ' within what you allowed.'),
        ('Why is there no Text button on the customer\'s quote?', 'It only shows on phones and tablets, and only if you typed your salesperson cell number.'),
        ('Why is there no Print this offer button?', 'It only shows with the Multi-Payment grid layout. With Adjustable, use Save this offer as a PDF on the customer page.'),
        ('I changed the deal. Does the old link update?', 'No. Each version gets its own quote ID. Send the new link.'),
        ('How long are quotes kept?', '90 days after they were last saved.'),
        ('Where do the alerts go?', 'To your dealership\'s system as set up by Rockstar, and the customer\'s "lock in" email goes to the salesperson notification email.'),
    ]
    if SUB:
        faq.insert(4, ('Why is there no credit score slider or lease?', 'Sub-prime quotes leave them out on purpose. Use Hidden or Fixed rate.'))
    if STD:
        faq.insert(4, ('Does the calculator work out lease payments?', 'No. You type the lease payments from your lease worksheet or lender.'))
    if PS:
        faq.insert(4, ('Where do the factory offers come from?', 'Rockstar collects them every week from the manufacturers\' public offer pages. Confirm each one before contracting.'))
        faq.insert(5, ('Why do I see no offers for a brand?', 'There are no offers on file for that brand this week, or the make is typed differently. Check the spelling of the make.'))
        faq.insert(6, ('Is there a lease option?', 'No. Powersports quotes are purchase only.'))
    P.append(f'''
<section>
  <h2>FAQ</h2>
  <dl class="faq">{''.join(f'<dt>{q}</dt><dd>{a}</dd>' for q, a in faq)}</dl>
</section>''')

    # ---------- glossary ----------
    gl = [
        ('APR', 'Annual percentage rate. The yearly interest rate on the loan.'),
        ('Amount financed', 'What the customer borrows: total price, minus trade equity, rebate and down payment.'),
        ('Customer link', 'The link you send the customer. Opens their personal quote.'),
        ('Desking link', 'A link for you to open at the desk with the customer. No Lock in button, no alerts.'),
        ('Doc fee', 'Your dealer documentation fee. Some states tax it.'),
        ('Down payment', 'Cash the customer puts down.'),
        ('Fixed rate', 'A rate you set that the customer can see but not change.'),
        ('Hidden rate', 'A rate used for the payment but never shown to the customer.'),
        ('Lock in', 'The customer tapping the button that says they want the deal.'),
        ('Multi-Payment grid', 'A table of 9 payments: 3 terms by 3 down payments.'),
        ('Negative equity', 'When the customer owes more on the trade than it is worth. Added to the amount financed.'),
        ('Quote ID', 'A short code for one version of a deal, like Q1A2B3C4.'),
        ('Rebate', 'Money off from the manufacturer or dealer.'),
        ('Term', 'How many months the loan lasts.'),
        ('Trade allowance', 'What you give the customer for their trade.'),
        ('Trade balance owed', 'What the customer still owes on their trade (the payoff).'),
        ('Trade equity', 'Trade allowance minus balance owed. Positive equity lowers the amount financed.'),
    ]
    if not SUB:
        gl.append(('Credit tier', 'A credit score range with its own rate, for example 661 to 720 = Good.'))
    if STD:
        gl.append(('Lease', 'A payment option to rent the vehicle for a set term and mileage.'))
    if PS:
        gl += [('Factory offer', 'A rebate or special rate from the manufacturer.'),
               ('Freight', 'The cost to ship the unit to the dealership.'),
               ('Setup and prep', 'The cost to assemble and get the unit ready.'),
               ('Hours', 'Engine hours. Used instead of miles on many off-road units and boats.')]
    if SUB:
        gl.append(('Sub-prime', 'Financing for customers with lower or rebuilding credit. Payments are subject to lender approval.'))
    gl.sort(key=lambda x: x[0].lower())
    P.append(f'''
<section>
  <h2>Glossary</h2>
  <dl class="gloss">{''.join(f'<dt>{a}</dt><dd>{b}</dd>' for a, b in gl)}</dl>
  <div class="help">
    <h3>Need help?</h3>
    <p>Talk to your manager first. For problems with the calculator itself, contact Rockstar support: <b>[SUPPORT EMAIL / PHONE]</b>.</p>
    <p class="fine">Payments, rates, tax, fees, rebates and offers shown by the calculator are estimates. Confirm everything before contracting.</p>
  </div>
</section>''')

    css = (HERE / 'guide.css').read_text()
    return f'''<!-- Rockstar dealer guide: {e(k["title"])} v{GUIDE_VERSION} | Updated {stamp} UTC -->
<!doctype html><html><head><meta charset="utf-8"><title>{D} {e(k["title"])} Guide</title>
<style>{css}</style></head><body data-kind="{c}">
{''.join(x if '<h2>' in x or 'class="cover"' in x else x.replace('<section>', '<section class="cont">', 1) for x in P)}
</body></html>'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kind', choices=list(KINDS), action='append')
    ap.add_argument('--dealer', default='[DEALER NAME]')
    ap.add_argument('--logo', default='')
    ap.add_argument('--site', default='[your-site].rockstarcrm.app')
    ap.add_argument('--out', default='')
    ap.add_argument('--outdir', default=str(HERE / 'out'))
    a = ap.parse_args()
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M')
    outdir = pathlib.Path(a.outdir); outdir.mkdir(parents=True, exist_ok=True)
    jobs = []
    for kind in a.kind or list(KINDS):
        k = KINDS[kind]
        name = a.out if (a.out and len(a.kind or []) == 1) else f'rockstar-{kind}-calculator-guide-v{GUIDE_VERSION}.pdf'
        htmlf = outdir / (pathlib.Path(name).stem + '.html')
        htmlf.write_text(build_html(kind, a.dealer, a.logo, a.site, stamp))
        jobs.append(dict(html=str(htmlf), pdf=str(outdir / name), header=f'{a.dealer} · {k["title"]} Guide',
                         footer=f'Guide v{GUIDE_VERSION} · Updated {stamp} UTC'))
    subprocess.run(['node', str(HERE / 'pdf.cjs'), json.dumps(jobs)], check=True)
    for j in jobs:
        print(j['pdf'])


if __name__ == '__main__':
    main()

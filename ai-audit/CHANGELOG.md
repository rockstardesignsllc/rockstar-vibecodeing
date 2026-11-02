# Rockstar AI Audit changelog

## v1.5: Demo pricing script + heads-up note
- Rex handles price pushback the way Mat sells: best vehicles at the best price, won't let a few dollars stop a deal, then side-by-side + two times. A second push gets "how close are we?", a few NEPQ-style questions, then the offer goes to the sales manager with a callback number confirmed (`worker/src/demo/prompt.ts`).
- `pages/bdc-demo.html` v1.2: heads-up note above the chat (made-up vehicle details; the AI is customized to your sales process). On phones the note stays in view above the chat.

## v1.4: Rex BDC Demo
- New self-selling demo at `https://bdcdemo.aifordealers.com` (`pages/bdc-demo.html` v1.0). Rex collects the dealership
  name, name, email, mobile (with a contact consent line) and website, reads the homepage and About page, then counts
  down 3, 2, 1 and role-plays as that dealership's AI agent. The dealer plays a shopper; Rex makes up the vehicle details
  and prices (and says so upfront), gives a real number on price questions, qualifies, and works for an appointment.
  After the mock appointment he steps out, asks what they thought, and offers a real demo with Mat (booking link plus
  an inline calendar).
- Same Worker as the audit, new `DemoSession` Durable Object (migration `v2`) under `/demo/sessions`. Same secrets.
  `bdcdemo.aifordealers.com` and `aifordealers.com` added to `ALLOWED_ORIGINS`.
- HighLevel: contact upsert (name, email, phone, company, website), Mat's existing fields AI Summary, Demo
  Conversation, Demo business name, Demo business industry and Demo Thoughts, a contact note with next steps and the
  transcript, and tags `ai demo started`, `ai demo completed`, `ai demo wants call`. A demo left idle for 30 minutes
  after the details are in is sent anyway with the tag `ai demo incomplete`.
- Mat's notification email: `emails/bdc-demo-notification.html`. Share image: `social/social-share-bdc-demo.png`.

## v1.3
- `pages/audit.html` v1.3: on phones the chat is sized to the visible screen, so the reply box is always in view
  without scrolling, whatever the phone's height or the browser's address bar. It re-fits when the screen rotates or
  the address bar shows or hides, and leaves the layout alone while the keyboard is open.

## v1.2
- Version stamps at the top of both pages: `pages/audit.html` v1.2, `pages/audit-complete.html` v1.1.
- Audit Complete page fires conversion events once per finished audit: Meta pixel `Lead` and Google
  `ai_audit_complete`, as soon as Mat adds those tags in the page's Tracking Code settings. A marked placeholder in
  the file says where the pixel goes.

## v1.1
- Two pages on the Rockstar Info site: the audit at `https://aiaudit.rockstarinfo.com` (`pages/audit.html`, was
  `embed.html`) and a new Audit Complete page at `https://aiaudit.rockstarinfo.com/audit-complete`
  (`pages/audit-complete.html`).
- When the audit ends, Rex sends the prospect to the Audit Complete page. It greets them by name and shows the
  Strategy Call calendar, prefilled with their details. If they said no to the call, it promises results within
  24 hours and offers the calendar as a softer option. Conversion tracking belongs on this page.
- The Worker's chat reply now carries `first_name`, and `booking_url` for every finished audit. `wants_call` still
  says whether they asked for the call. `aiaudit.rockstarinfo.com` is added to `ALLOWED_ORIGINS`.
- SEO titles, descriptions, keywords and social sharing images for both pages: `SEO.md` and `social/`.
- Mat's notification email moved to `emails/mat-notification.html` so it is not mixed up with the Audit Complete page.

## v1.0
- Rex from Rockstar runs a self-serve AI Audit inside a HighLevel page (`embed.html`, now `pages/audit.html`). Rex collects name, business,
  website, mobile and email, reads the website, asks 12 audit questions, gives the headline opportunity and RockstarAI
  path, and offers a 20 minute Strategy Call with the booking link.
- Cloudflare Worker `rockstar-ai-audit`, with one Durable Object per audit, on Claude Sonnet 5.5 with server-side
  refusal fallback.
- 27 contact fields in the Rockstar Designs sub account, named "AI Audit - ...". Tags: `ai audit started`,
  `ai audit complete` and `ai audit wants call`. A contact note holds the full report and transcript.
- Mat's notification email template: `emails/audit-complete.html` (now `emails/mat-notification.html`).

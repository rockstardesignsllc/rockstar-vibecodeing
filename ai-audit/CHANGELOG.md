# Rockstar AI Audit changelog

## v1.8.6: Call Coach test waits its turn
- "Test on one call" clicked while the automatic check is running (it starts right after Save) now waits up to 45 seconds for it to finish instead of answering "A run is already in progress".

## v1.8.5: Call Coach transcript address
- The transcript was requested at the wrong HighLevel address (location and message swapped), so every call read as "no transcript". It now uses `/conversations/locations/<location>/messages/<message>/transcription`.

## v1.8.4: Test a call by its conversation ID
- "Test on one call" (setup page v1.3) accepts the conversation ID from the HighLevel URL and scores that conversation's longest answered inbound call. A call's message ID still works.

## v1.8.3: Call Coach transcript fetch
- A transcript that HighLevel refuses to hand over (token scope, API version) is now reported with HighLevel's own error instead of "no transcript". The transcript route is asked under both API versions.

## v1.8.2: Call Coach works with Private Integration tokens
- HighLevel refuses the single-message read to Private Integration tokens (401 "Token source/channel mismatch"). "Test on one call" now pages through the sub-account's call list to find the call. The list is sorted newest first on our side.
- Setup page v1.2 reports how many calls HighLevel returned and their date range when a call is not found.

## v1.8.1: Call Coach test-score fix
- "Test on one call" now fetches the call straight from HighLevel by its message ID instead of looking for it in the recent-calls list, which came back empty on the first live test. The recent-calls check asks under both HighLevel API versions.
- The setup page (`pages/call-coach-setup.html` v1.1) shows how many calls the last automatic check saw, and any error it hit.

## v1.8: Call Coach phase 1 (call scoring and coaching)
- New Call Coach under `/coach` on the same Worker (`worker/src/coach/`). Every 5 minutes it reads each dealership's new
  inbound HighLevel calls, waits until a call is 10 minutes old, pulls the transcript, and has Claude score it against
  that department's call framework (Sales, BDC or Service). Calls under 60 seconds, voicemails, wrong numbers and
  AI-answered calls are skipped.
- Results: a contact note titled "[customer] inbound call [date] [time] [staff]", a coaching email to the staff member
  with managers copied (wins first, then tune-ups with "say this next time" wording from the framework), a full summary
  page with the scorecard and recording, a manager dashboard by day, and a 7 AM dealership-time summary email.
- One `DealerCoach` Durable Object per HighLevel sub-account (migration `v3`) holds its settings, token and scores.
  New var `COACH_BASE_URL`. No new secrets; the setup page and admin routes use `ADMIN_KEY`.
- `pages/call-coach-setup.html` v1.0, served at `/coach/setup`: turn on a dealership, paste or upload (PDF) its
  frameworks, and test-score a single call.
- The Rex practice call is phase 2 and is not in this release.

## v1.7: Demo features and price-close order
- Rex names the main features in plain words when asked (touchscreen, sound system, moonroof, heated and cooled seats, driver assists) and never quotes package codes like "502A".
- No cash, finance, lease, trade or down payment questions until the shopper brings up price or payments.
- On a second price push, Rex asks the commitment question first ("If we got to $X out the door, is there anything else that would keep you from moving forward?"). Only after a yes does he ask about a trade and cash vs. finance, saying it doesn't change the price (`worker/src/demo/prompt.ts`).

## v1.6: The demo page updates itself
- New `GET /demo/embed.js` on the Worker serves `pages/bdc-demo.html` (bundled as text). HighLevel now holds only `pages/bdc-demo-loader.html` (v2.0), so page changes on main go live with the automatic Worker deploy, no paste. Browser cache: 5 minutes.

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

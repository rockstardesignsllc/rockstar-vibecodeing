# Rockstar AI Audit changelog

## v1.16: Call Coach staff list and Practice Calls on dealer dashboards
- Setup page v1.10: a staff list per dealership (name, department, optional mobile and email). Calls are attributed to the listed name, so "Matt" and "Matt Piarski" are one person. Calls already scored are regrouped when the dashboard is opened; nothing is rescored.
- Each dealership's dashboard has a "Practice Calls" section, by person, in the 30 day view and the day view. Practice calls no longer mix into the regular call lists or the 7 AM summary.
- A practice call by a matched staff member is copied to their own dealership, and their scorecard email links to that dealership's page. The recording is streamed from the sub-account that owns the practice line, only for that dealership's own practice calls.
- The practice line recognizes a caller by the mobile number on the staff list, then by HighLevel user phone, then by name and dealership.

## v1.15: Call Coach scores practice calls with Rex
- Calls to the Rex practice line (`COACH_PRACTICE_LINES`, now +1 269-575-0069) are scored as practice calls: the caller is the staff member, Rex is the customer. Five scenarios, each with its own framework: inbound sales, inbound BDC, outbound prospecting, service survey, inbound service.
- The caller is matched to a user of any dealership set up for Call Coach (by phone, else by name and dealership said on the call). Their scorecard email copies that dealership's managers. Unmatched callers get it at the email on their contact or the one they gave Rex, with the Rockstar Designs managers copied.
- The practice call's note goes on the caller's contact in Rockstar Designs, and the contact's blank name, email and company are filled in so Rex knows them next time.
- Rex's prompt (v1.2) and the new inbound service framework are in `docs/rex-practice-line/`.

## v1.14.2: Rockstar branding on the Call Coach setup page
- Setup page v1.9: Rockstar logo header, title "Rockstar Call Coach Setup", black, red, white and gray styling, and the logo as the tab icon.
- New "Remember the admin key on this computer" box. The key is kept only in that browser's storage, never in the page or the repository; unticking it forgets the key.

## v1.14.1: Call Coach setup only on its own address
- `/coach/setup` and `/coach/admin` now answer only on `callcoach.rockstarai.app`, where Cloudflare Access (email sign-in) guards them. On the workers.dev address the setup page redirects there and admin calls are refused. Dealer dashboards, coaching pages and recordings still work on both addresses.

## v1.14: Call Coach lives at callcoach.rockstarai.app
- `COACH_BASE_URL` is now `https://callcoach.rockstarai.app`, so new notes, emails, coaching pages and dashboard links use the branded address. Links on the workers.dev address keep working.
- Removed the unused `coach-domain/` Pages project (the custom domain made it unnecessary). Setup guide v1.2 carries the new setup address.

## v1.13.3: Call Coach custom domain
- The Worker now also answers on `callcoach.rockstarai.app` (a custom domain in `wrangler.jsonc`; rockstarai.app is in the same Cloudflare account). The workers.dev address stays on. `COACH_BASE_URL` is unchanged until the new address is confirmed.

## v1.13.2: Call Coach branded address (first half)
- New `ai-audit/coach-domain/`: a Cloudflare Pages project (`rockstar-call-coach`) that passes `/coach/*` to the Worker through a service binding, so Call Coach can live at `callcoach.rockstarcrm.app` while that domain's DNS stays at GoDaddy. Setup steps are in the README. `COACH_BASE_URL` still points at workers.dev until the new address is confirmed working.

## v1.13.1: Call Coach setup messages stay in view
- Setup page v1.8: the green and red status message now sticks to the bottom of the window. Before, pressing My dealers without the admin key put "Enter the admin key first" at the bottom of the page, out of sight, so the button looked dead.

## v1.13: Call Coach scores by what the call was about
- Every call is tagged by topic, "Sales related", "Service related" or "Other", whoever answered it. The pill shows on the dashboard, the coaching page, the email, the note and the 7 AM summary.
- The topic picks the scorecard: the dealership's Sales (or BDC) framework for a sales related call, its Service framework for a service related call, and a new built-in General scorecard for everything else. A salesperson who takes a service call is no longer graded on the sales framework, and a dealership with no frameworks at all is scored on the General scorecard.
- General scorecard: answered professionally, listened and understood, took ownership and resolved it, got the name and number, asked for the visit (only when one applies), said what happens next, customer satisfaction, name use, other questions, tone.
- Every call now records the customer's mood at the end and each follow-up the staff member promised. Follow-ups are listed in the note, the email and the coaching page. The 7 AM summary and the one-day dashboard open with a "Needs attention" block of frustrated customers and promised follow-ups.
- "No appointment set" is no longer shown on General scorecard calls.
- Setup page v1.7: frameworks are optional, and "Department when unsure" is gone because the topic decides.
- The setup guide (PDF v1.1 and its source) is in `ai-audit/docs/`.

## v1.12: Call Coach dashboard by staff member
- The manager dashboard now opens on the last 30 days grouped by staff member: name, average score, calls and appointments set. Clicking a name opens all of their calls, newest first, each with its score and a link to the full summary.
- The one-day view is still there (the 7 AM email links to it) and each view links to the other.

## v1.11: Call Coach dealer list
- Setup page v1.6 has a "My dealers" button: every dealership set up, on or paused, calls scored, its dashboard link (copy or open), Edit and Delete. Backed by a new `CoachDirectory` Durable Object (migration v4) that each dealership registers with on Save, and on its next automatic check for dealerships saved earlier.
- Delete removes a dealership's settings, token and scored calls and stops its scoring. Notes already written in HighLevel stay.
- The coaching page button now reads "Open this call in Rockstar".
- A call with no assigned user and no name match falls back to the user the contact is assigned to.

## v1.10: Call Coach outbound scoring (add-on)
- New per-dealer switch "Also score outbound calls" and an Outbound framework box (setup page v1.5). Off by default, so inbound-only dealers are unchanged.
- Outbound calls get their own scorecard: who they are and why they are calling, keeping the call on its goal, handling questions, the appointment items when a visit applies, tone and next step. A voicemail left is not scored.
- Notes, emails and the coaching page say "outbound call", and the customer phone is the number that was dialed.

## v1.9: Call Coach launch changes
- The coaching email is now a short notice: subject "Call Scoring for [customer] [phone] complete at [date time]", the score, a one-line summary and a button to the coaching page. The full coaching stays on the page and in the contact note.
- The coaching page has an "Open this call in the CRM" button that goes to the call's conversation in HighLevel (recording and transcript). The address comes from the new `COACH_APP_URL` var.
- Calls HighLevel leaves unassigned (phone tree calls) are matched to a user by the name the staff member gives on the call, so the email still reaches them. No match, or two users with that name, sends to the managers only.

## v1.8.9: Call Coach recordings play in Safari
- The recording link now answers byte-range requests, which Safari and iPhones need before they will play audio. A recording HighLevel refuses is reported with its status instead of a blank player.

## v1.8.8: Call Coach setup page clears the old dealer's name
- Changing the sub-account ID on the setup page (v1.4) clears the name, time zone and token boxes, so a second dealership is not saved under the first one's name.

## v1.8.7: Call Coach reads calls by date
- On a busy dealership HighLevel answered the call list starting months back instead of newest first, so recent calls were never seen. The automatic check now asks for the last 24 hours by date, and "Test on one call" searches the last 2, 7, 30, then 90 days.

## v1.8.6: Call Coach test waits its turn, wrong-account tokens refused
- Save now refuses a token created in a different sub-account. HighLevel answers the call list for the token's own sub-account whatever location is asked for, so such a token silently read another account's calls.
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

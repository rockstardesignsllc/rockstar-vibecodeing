# Rockstar AI Audit changelog

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

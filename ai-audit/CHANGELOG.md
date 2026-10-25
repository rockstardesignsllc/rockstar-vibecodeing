# Rockstar AI Audit changelog

## v1.0
- Rex from Rockstar runs a self-serve AI Audit inside a HighLevel page (`embed.html`). Rex collects name, business,
  website, mobile and email, reads the website, asks 12 audit questions, gives the headline opportunity and RockstarAI
  path, and offers a 20 minute Strategy Call with the booking link.
- Cloudflare Worker `rockstar-ai-audit`, with one Durable Object per audit, on Claude Sonnet 5.5 with server-side
  refusal fallback.
- 27 contact fields in the Rockstar Designs sub account, named "AI Audit - ...". Tags: `ai audit started`,
  `ai audit complete` and `ai audit wants call`. A contact note holds the full report and transcript.
- Mat's notification email template: `emails/audit-complete.html`.

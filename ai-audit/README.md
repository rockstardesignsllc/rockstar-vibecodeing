# Rockstar AI Audit (Rex)

A self-serve AI Audit for the HighLevel page you send to anyone who says yes to an audit. Rex from Rockstar chats with
the prospect, reads their website, asks the audit questions, recommends a RockstarAI path, and offers a 20 minute
Strategy Call. When the audit is done, Claude writes a report, the Worker fills the prospect's HighLevel contact, and a
HighLevel workflow emails Mat the full summary, his next steps, and a ready-to-send email for the prospect.

```
aiaudit.rockstarinfo.com (pages/audit.html)  ──►  Cloudflare Worker (worker/)  ──►  Claude (Sonnet 5.5)
                                      │  one Durable Object per audit holds the conversation
                                      └──►  HighLevel API: contact, AI Audit fields, note, tags
                                                 └──►  Workflow on tag "ai audit complete" emails Mat
aiaudit.rockstarinfo.com/audit-complete (pages/audit-complete.html): thank-you page with the booking calendar
```

## What the prospect sees

1. Rex asks for first and last name, business name, website, mobile number and email, one at a time. Rex reads the
   website as soon as it is given and mentions something specific from it.
2. As soon as all six details are in, the contact is created in HighLevel with the tag `ai audit started`, so an audit
   abandoned halfway is still a lead.
3. Rex asks the 12 audit questions, adapted to their industry:
   1. Where new customers come from
   2. What happens to after-hours and weekend leads
   3. How fast they respond to a new lead
   4. Leads per month, and how many become customers
   5. Average sale or customer value
   6. Follow-up with people who do not buy right away
   7. How they get reviews, and how many Google reviews they have
   8. The repetitive task that eats the most team time
   9. Software, CRM and phone system
   10. The one thing they would hand to AI tomorrow
   11. What has held them back
   12. How soon they want something live
4. Rex gives the headline: the biggest opportunity, the rough monthly cost, and the RockstarAI path. Then Rex asks
   whether they want a 20 minute Strategy Call.
5. Rex closes out, and a few seconds later the prospect moves to the Audit Complete page. If they said yes, the page
   greets them by name and shows your booking calendar, prefilled with their name, email and phone. If they said no,
   it tells them the results will be sent over within 24 hours and offers the calendar as a softer option.

Pricing questions always get: "RockstarAI tools start as low as $10 per day, but we customize our pricing to help you
get the best results for the lowest investment."

## What Mat gets

About 30 seconds after the audit ends:

- The contact's **AI Audit -** fields are filled in (all 27 are listed in `worker/src/fields.ts`).
- A contact note holds the summary, the recommendations, Mat's next steps and the full transcript.
- Tags: `ai audit complete`, plus `ai audit wants call` when they asked for the Strategy Call.
- The workflow below emails mat@rockstarinfo.com with everything, including the prospect email draft to review, copy
  and send.

## Setup

### 1. Deploy the Worker (one time)

Use the same Cloudflare API token and account as the quote store (`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).

```bash
cd ai-audit/worker
npm install
npx wrangler deploy
npx wrangler secret put ANTHROPIC_API_KEY     # the Claude API key
npx wrangler secret put HIGHLEVEL_TOKEN       # the Private Integration token from step 2
openssl rand -hex 24 | npx wrangler secret put ADMIN_KEY   # only needed for the redeliver command below
```

The Worker goes live at `https://rockstar-ai-audit.rockstar-designs-llc.workers.dev`, which is already in `pages/audit.html`.
If Cloudflare gives it a different address, put that address in `apiUrl` at the top of the script in `pages/audit.html`.

### 2. HighLevel Private Integration token

In the **Rockstar Designs** sub account: Settings, Private Integrations, Create new integration. Name it
"Rockstar AI Audit" and give it the scopes `contacts.write` and `contacts.readonly`. Copy the token into the
`HIGHLEVEL_TOKEN` secret.

### 3. The two pages

Follow `SEO.md`: it has both pages' names, addresses, the file to paste into each, and their titles, descriptions,
keywords and social sharing images. Page 1 is `https://aiaudit.rockstarinfo.com`, page 2 is
`https://aiaudit.rockstarinfo.com/audit-complete`.

The Worker only answers pages on the domains in `ALLOWED_ORIGINS` in `worker/wrangler.jsonc`: `aiaudit.rockstarinfo.com`,
`app.rockstarinfo.com` (the HighLevel preview domain), `rockstarinfo.com` and `getrockstarai.com`. To move the audit to
another domain, add it there and run `npx wrangler deploy` again, and change `completeUrl` in `pages/audit.html`.

### 4. Mat's email workflow

1. Automation, Workflows, Create workflow. Trigger: **Contact Tag Added**, tag `ai audit complete`.
2. Action: **Internal Notification**, type Email, to the specific email `mat@rockstarinfo.com`.
   Subject: `AI Audit: {{contact.company_name}} ({{contact.ai_audit__opportunity_score}}/10)`
3. In the email body's code view, paste in `emails/mat-notification.html`.
4. Publish.

Optional: a second workflow for abandoned audits. Trigger on tag `ai audit started`, wait 2 hours, and if the contact
does not have `ai audit complete`, notify Mat or start a follow-up text.

### 5. Put the fields in the AI AUDIT folder

HighLevel's API can't create folders for contact fields, so this is one manual step. Go to Settings, Custom Fields,
and search "AI Audit". Select all 27 fields, choose Move to folder, and create the folder **AI AUDIT**. The Worker
writes fields by ID, so moving them changes nothing.

### 6. Test it

Open the page, run an audit with your own details, and say yes to the call. Within a minute, the contact should have
its AI Audit fields, a note and both tags, and the email should be in your inbox.

## Running it

- **Cost:** Claude Sonnet 5.5 runs roughly 20 to 40 cents per completed audit, including the report. The fixed
  instructions are cached, so later messages in an audit cost less.
- **Logs:** Cloudflare dashboard, Workers, rockstar-ai-audit, Logs. A failed HighLevel write is retried 5 times over a
  few minutes. If it still fails (for example the token expired), fix the problem and resend the audit:

  ```bash
  curl -X POST -H "x-admin-key: <ADMIN_KEY>" https://rockstar-ai-audit.rockstar-designs-llc.workers.dev/sessions/<session id>/redeliver
  ```

  The session id is in the log line.
- **Limits:** 5 new audits and 30 messages per minute per visitor, 60 messages per audit, 1,500 characters per message.
- **Data kept:** an unfinished audit is deleted after 30 days. A finished one is deleted from Cloudflare 90 days after
  it is sent to HighLevel. HighLevel keeps the contact, fields and note.
- **Changing Rex:** the questions, voice, product catalog and pricing line are in `worker/src/prompt.ts`. Deploy again
  after any change.
- **AI Gateway (optional):** set `ANTHROPIC_BASE_URL` to a Cloudflare AI Gateway URL to get request logs and cost
  tracking.

## Files

| Path | What it is |
|---|---|
| `pages/audit.html` | Page 1, the Rex chat. Paste into a HighLevel Custom HTML/JS element |
| `pages/audit-complete.html` | Page 2, the thank-you page with the booking calendar |
| `SEO.md` | Page names, addresses, SEO titles, descriptions, keywords and share images |
| `social/` | The share images (PNG) and the HTML they are rendered from |
| `emails/mat-notification.html` | Mat's notification email body for the HighLevel workflow |
| `worker/src/index.ts` | Routes, CORS and rate limits |
| `worker/src/session.ts` | The `AuditSession` Durable Object: conversation, tools, report delivery |
| `worker/src/prompt.ts` | Rex's instructions, the RockstarAI catalog and the report instructions |
| `worker/src/tools.ts` | Rex's tools (`read_website`, `save_contact`, `complete_audit`) and input checks |
| `worker/src/website.ts` | Reads the prospect's homepage and spots chat, booking and form tools |
| `worker/src/report.ts` | Writes the structured report for Mat and the prospect email draft |
| `worker/src/highlevel.ts` | HighLevel contact upsert, note and tags |
| `worker/src/fields.ts` | The 27 HighLevel AI Audit field IDs and the tags |

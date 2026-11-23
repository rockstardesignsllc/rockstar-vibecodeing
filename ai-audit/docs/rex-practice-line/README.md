# Rex practice line

Rex is the HighLevel Voice AI agent "Rex Call Coach" (id `6af396f0a7b04d081ba8d1c9`) in the Rockstar Designs sub-account, answering +1 269-575-0069. Dealership staff call it to role-play a call. Rex plays the customer, then coaches.

- `rex-agent-prompt.md` is the agent's prompt (v1.5, 2026-11-23: Rex never plays the employee, frameworks marked as the rep's lines, email spelled back; v1.4 added practice codes). HighLevel holds the live copy; change this file and the agent together (Voice AI API, `PATCH /voice-ai/agents/{id}`).
- The five scenarios and their frameworks are also in `worker/src/coach/practice.ts`, which scores the practice calls. Keep the two in step.
- Rex says "scenario locked: <scenario>, <difficulty> difficulty" before each role-play (plus ", practice code <digits>" for a specific call), and "And scene" after it. The scorer relies on both.

## Practice a specific call (practice codes, v1.20)

- Every newly scored call gets a six-digit practice code, unique across all dealerships, good for 7 days. It is on the coaching email, the call page and the dashboard. Codes live in the `CoachDirectory` Durable Object.
- Rex asks "a specific call, or general practice?". For a specific call he reads the code back, then calls the HighLevel custom action **look_up_practice_code**: `POST /coach/practice/lookup` with `Authorization: Bearer <COACH_PRACTICE_KEY>` and a `code` parameter. The answer tells him the scenario, what happened (the real customer's name replaced by `[customer]`), what went well and what to practice. A bad code answers `found: false` with a message for Rex. One retry, then general practice.
- When the practice call is scored, the scorer reads the code Rex locked in, and each tune-up from the real call is judged fixed or not yet. The practice scorecard shows "Tune-ups from the real call: 2 of 3 fixed". If the caller is not matched, the practice is credited to the rep on the real call and that dealership's managers are copied.
- Setup, once: set the Worker secret `COACH_PRACTICE_KEY` (Cloudflare, Workers & Pages, rockstar-ai-audit, Settings, Variables and Secrets), and in HighLevel add a Custom action 2.0 on Rex named `look_up_practice_code` with that URL, POST, Bearer token = the same secret, and one String parameter `code` (in: Body, required), Retry on failure on. Without the secret, lookups answer 503 and Rex falls back to general practice.
- The Worker treats any inbound call to a number in `COACH_PRACTICE_LINES` (wrangler.jsonc) as a practice call. The sub-account that owns the number (Rockstar Designs) must be set up on the Call Coach setup page with scoring on.
- The caller is matched to a dealership set up for Call Coach: by the mobile number on its staff list, else by a HighLevel user's phone, else by their name and the dealership they said. A matched call is copied to that dealership, where it shows under Practice Calls on the dashboard. Their scorecard goes to them, with that dealership's managers copied. An unmatched caller's scorecard goes to the email on their contact or the one they gave Rex, with the Rockstar Designs managers copied.

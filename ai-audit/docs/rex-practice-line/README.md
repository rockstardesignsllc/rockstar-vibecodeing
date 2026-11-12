# Rex practice line

Rex is the HighLevel Voice AI agent "Rex Call Coach" (id `6af396f0a7b04d081ba8d1c9`) in the Rockstar Designs sub-account, answering +1 269-575-0069. Dealership staff call it to role-play a call. Rex plays the customer, then coaches.

- `rex-agent-prompt.md` is the agent's prompt (v1.1, 2026-11-12). HighLevel holds the live copy; change this file and the agent together (Voice AI API, `PATCH /voice-ai/agents/{id}`).
- The five scenarios and their frameworks are also in `worker/src/coach/practice.ts`, which scores the practice calls. Keep the two in step.
- Rex says "scenario locked: <scenario>, <difficulty> difficulty" before each role-play, and "And scene" after it. The scorer relies on both.
- The Worker treats any inbound call to a number in `COACH_PRACTICE_LINES` (wrangler.jsonc) as a practice call. The sub-account that owns the number (Rockstar Designs) must be set up on the Call Coach setup page with scoring on.
- The caller is matched to a user of a dealership set up for Call Coach, by the phone they called from, else by their name and the dealership they said. Their scorecard goes to them, with that dealership's managers copied. An unmatched caller's scorecard goes to the email on their contact or the one they gave Rex, with the Rockstar Designs managers copied.

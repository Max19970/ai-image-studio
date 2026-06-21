# Goal: Server-Owned Runtime Stability

Use Krypton Execution to execute `docs/goals/server-owned-runtime-stability/PLAN.md`.

Core rules:
- Treat PLAN.md as the source plan.
- Preserve intent, ownership, contract, cutover, evidence, and kill criteria.
- Do not add a new dominant path without deleting, redirecting, demoting, or shimming the displaced path.
- Frontend may show submit/status UI, but gallery task cards and task mutations must come from server state/events.
- Capture acceptance evidence from the target perspective.
- Say "implemented but unproven" if that evidence cannot be captured.

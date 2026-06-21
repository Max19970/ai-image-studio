# Goal: Gallery Filesystem

Use Krypton Execution to execute `docs/goals/gallery-filesystem/PLAN.md`.

Core rules:
- Treat PLAN.md as the source plan.
- Preserve intent, ownership, contract, cutover, evidence, and kill criteria.
- Gallery folders must be first-class gallery items, not fake generation tasks.
- Generation task placement truth is `GenerationTask.galleryPath`.
- New single and batch generations must inherit the currently active gallery path.
- Do not add a new dominant task-only gallery grid path without deleting, redirecting, demoting, or shimming the displaced path.
- Capture acceptance evidence from the target perspective.
- Say "implemented but unproven" if visual evidence cannot be captured.

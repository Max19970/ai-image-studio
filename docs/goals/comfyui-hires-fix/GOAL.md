# Goal: Provider-Owned Generation Modes + ComfyUI Hires Fix

Use Krypton Execution to execute `docs/goals/comfyui-hires-fix/PLAN.md`.

Core rules:

- Treat `PLAN.md` as the source plan.
- Preserve intent, ownership, contract, cutover, evidence, and kill criteria.
- Work only in the isolated implementation worktree/branch until Max accepts the update.
- Replace user-facing global `generate/edit` modes with provider-owned generation modes.
- Do not add `hires-fix` to global `WorkMode`; `hires-fix` must be a ComfyUI provider mode.
- Preserve OpenAI-compatible Generate/Edit behavior by modelling them as OpenAI-compatible provider modes.
- Provider mode must own parameter availability, attachment policy, payload building, submit transport, snapshot summary, and detail rows.
- Do not route ComfyUI Hires Fix through old global edit semantics.
- Keep mono and batch generation independent per request/provider/provider mode.
- Do not add a new dominant path without deleting, redirecting, demoting, or shimming the displaced path.
- Capture acceptance evidence from the target perspective: provider mode picker, mode-specific parameters, one-image Hires Fix attachment behavior, successful payload/workflow, batch independence, and detail-page rows.
- Say "implemented but unproven" if visual or ComfyUI runtime evidence cannot be captured.

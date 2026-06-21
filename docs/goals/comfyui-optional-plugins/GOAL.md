# Goal: ComfyUI Optional Workflow Plugins

Use Krypton Execution to execute `docs/goals/comfyui-optional-plugins/PLAN.md`.

Core rules:
- Treat PLAN.md as the source plan.
- Preserve provider-owned parameter ownership and existing ComfyUI adapter ownership.
- Do not add a new dominant ComfyUI path without deleting, redirecting, demoting, or explicitly rejecting the displaced path.
- Optional add-ons must be disabled by default and must not alter existing workflows when disabled.
- Do not silently ignore incompatible options; reject Tiled Generation plus PerpNegGuider explicitly.
- Capture acceptance evidence from workflow JSON and generated parameter payloads.
- Say "implemented but unproven" if build/tests or visual evidence cannot be captured.

# Goal: Generation Progress Tracking

Use the staged plan in docs/goals/generation-progress-tracking/PLAN.md.

Core rules:

- Provider adapters own how progress is acquired and normalized.
- React UI consumes only normalized task images and progress state.
- OpenAI-compatible progress comes from streaming partial and final image events.
- ComfyUI progress comes from server-side websocket monitoring bridged through the app proxy stream.
- Final images must replace in-flight partial previews when available.
- Keep single and batch generation behavior independent per provider and mode.
- Capture acceptance evidence from gallery, detail, batch, and task behavior, not only from TypeScript passing.
- Report implemented but runtime-unproven for live ComfyUI websocket behavior if no local ComfyUI runtime is available.

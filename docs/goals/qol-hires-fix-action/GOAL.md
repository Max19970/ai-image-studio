# Goal: Hires Fix QoL Actions and Mode-Owned Value Validation

Use Krypton Execution-style discipline to implement `docs/goals/qol-hires-fix-action/PLAN.md`.

Core rules:
- Provider generation modes own image-size and numeric submit constraints.
- UI inputs should not coerce sizes or Hires scale while the user is typing.
- Submit payloads and snapshots must use the resolved mode-valid values.
- Hires Fix quick action must reuse the selected image, switch to ComfyUI Hires Fix, and restore the selected image request parameters.
- Avoid adding page-level ComfyUI special cases outside provider/mode contracts and gallery action wiring.
